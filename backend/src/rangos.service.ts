import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PERMISSIONS, PERMISSION_KEYS } from './permissions.catalog';

@Injectable()
export class RangosService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** El catálogo completo (área, clave, etiqueta, si es peligroso) — con esto arma el frontend la grilla de Rangos. */
  catalog() {
    return PERMISSIONS;
  }

  async list(tenantId: string) {
    const rangos = await this.prisma.rango.findMany({
      where: { tenantId },
      include: { permissions: { select: { key: true } }, _count: { select: { users: true } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return rangos.map(r => ({ id: r.id, name: r.name, isSystem: r.isSystem, userCount: r._count.users, permissions: r.permissions.map(p => p.key) }));
  }

  async get(tenantId: string, id: string) {
    const rango = await this.prisma.rango.findFirst({ where: { id, tenantId }, include: { permissions: { select: { key: true } }, _count: { select: { users: true } } } });
    if (!rango) throw new NotFoundException('Rango no encontrado');
    return { id: rango.id, name: rango.name, isSystem: rango.isSystem, userCount: rango._count.users, permissions: rango.permissions.map(p => p.key) };
  }

  private validarClaves(keys: unknown): string[] {
    if (!Array.isArray(keys)) throw new UnprocessableEntityException('permissions debe ser una lista');
    const limpio = [...new Set(keys.filter((k): k is string => typeof k === 'string'))];
    const invalida = limpio.find(k => !PERMISSION_KEYS.has(k));
    if (invalida) throw new UnprocessableEntityException(`"${invalida}" no es un permiso válido`);
    return limpio;
  }

  /**
   * ¿Queda alguien activo (fuera de las exclusiones) que pueda gestionar
   * usuarios? Protege contra dejar la empresa sin nadie que pueda arreglar
   * esto — la usa tanto acá (al sacarle el permiso a un rango) como
   * UsersController (al cambiarle el rango a una persona o desactivarla).
   */
  async quedaAlguienConGestionarUsuarios(tenantId: string, opts: { excludeUserId?: string; excludeRangoId?: string } = {}) {
    const count = await this.prisma.user.count({
      where: {
        tenantId,
        isActive: true,
        ...(opts.excludeUserId ? { id: { not: opts.excludeUserId } } : {}),
        ...(opts.excludeRangoId ? { rangoId: { not: opts.excludeRangoId } } : {}),
        rango: { permissions: { some: { key: 'usuarios.gestionar' } } },
      },
    });
    return count > 0;
  }

  async create(tenantId: string, body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new BadRequestException('El nombre es obligatorio');
    // Clonar trae los permisos de otro rango como punto de partida; si no, arranca sin ninguno.
    const cloneFromId = typeof body.cloneFromId === 'string' && body.cloneFromId ? body.cloneFromId : null;
    let keys: string[] = [];
    if (cloneFromId) {
      const origen = await this.prisma.rango.findFirst({ where: { id: cloneFromId, tenantId }, include: { permissions: { select: { key: true } } } });
      if (!origen) throw new BadRequestException('El rango a clonar no existe');
      keys = origen.permissions.map(p => p.key);
    } else if (body.permissions !== undefined) {
      keys = this.validarClaves(body.permissions);
    }
    try {
      const rango = await this.prisma.rango.create({ data: { tenantId, name, isSystem: false } });
      if (keys.length) await this.prisma.rangoPermission.createMany({ data: keys.map(key => ({ tenantId, rangoId: rango.id, key })) });
      return this.get(tenantId, rango.id);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un rango con ese nombre');
      throw error;
    }
  }

  async update(tenantId: string, id: string, body: Record<string, unknown>) {
    const actual = await this.prisma.rango.findFirst({ where: { id, tenantId }, include: { permissions: { select: { key: true } } } });
    if (!actual) throw new NotFoundException('Rango no encontrado');
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : actual.name;

    if (body.permissions !== undefined) {
      const nuevas = this.validarClaves(body.permissions);
      const teniaGestionar = actual.permissions.some(p => p.key === 'usuarios.gestionar');
      const tendraGestionar = nuevas.includes('usuarios.gestionar');
      if (teniaGestionar && !tendraGestionar) {
        const quedaAlguien = await this.quedaAlguienConGestionarUsuarios(tenantId, { excludeRangoId: id });
        if (!quedaAlguien) throw new ConflictException('Tiene que quedar al menos un usuario activo, en otro rango, que pueda gestionar usuarios');
      }
      await this.prisma.$transaction([
        this.prisma.rangoPermission.deleteMany({ where: { tenantId, rangoId: id } }),
        ...(nuevas.length ? [this.prisma.rangoPermission.createMany({ data: nuevas.map(key => ({ tenantId, rangoId: id, key })) })] : []),
      ]);
    }
    try {
      await this.prisma.rango.update({ where: { id }, data: { name } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un rango con ese nombre');
      throw error;
    }
    return this.get(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const rango = await this.prisma.rango.findFirst({ where: { id, tenantId }, include: { _count: { select: { users: true } } } });
    if (!rango) throw new NotFoundException('Rango no encontrado');
    if (rango._count.users > 0) throw new ConflictException(`Hay ${rango._count.users} usuario(s) con este rango — reasigná antes de borrarlo`);
    await this.prisma.rango.delete({ where: { id } });
    return { deleted: true };
  }
}
