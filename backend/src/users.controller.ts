import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { PrismaService } from './prisma/prisma.service';
import { RangosService } from './rangos.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RangosService) private readonly rangos: RangosService,
  ) {}

  @Get() @RequirePermission('usuarios.ver')
  list(@Req() request: AuthRequest) {
    return this.prisma.user.findMany({
      where: { tenantId: request.user.tenantId },
      select: { id: true, name: true, email: true, rangoId: true, rango: { select: { name: true } }, isActive: true, branchId: true, branch: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }).then(rows => rows.map(({ rango, ...u }) => ({ ...u, rangoName: rango.name })));
  }

  @Post()
  @RequirePermission('usuarios.gestionar')
  create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.auth.createUser(request.user.tenantId, body);
  }

  @Put(':id')
  @RequirePermission('usuarios.gestionar')
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const current = await this.prisma.user.findFirst({ where: { id, tenantId }, include: { rango: { include: { permissions: true } } } });
    if (!current) throw new BadRequestException('Usuario no encontrado');

    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : current.name;
    const rangoId = typeof body.rangoId === 'string' && body.rangoId ? body.rangoId : current.rangoId;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : current.isActive;
    // Se asigna una sucursal; el depósito operativo se deriva de ella.
    const asignacion = body.branchId === undefined
      ? { branchId: current.branchId, warehouseId: current.warehouseId }
      : await this.auth.resolveBranchAssignment(tenantId, body.branchId);

    if (rangoId !== current.rangoId && !(await this.prisma.rango.findFirst({ where: { id: rangoId, tenantId } }))) throw new BadRequestException('Rango no encontrado');

    // Misma protección que antes con "al menos un admin", generalizada: no se
    // puede dejar la empresa sin nadie activo que pueda gestionar usuarios.
    const teniaGestionar = current.rango.permissions.some(p => p.key === 'usuarios.gestionar');
    const pierdeGestionar = teniaGestionar && (!isActive || rangoId !== current.rangoId);
    if (pierdeGestionar) {
      const nuevoRangoTieneGestionar = rangoId === current.rangoId
        ? teniaGestionar
        : (await this.prisma.rangoPermission.findFirst({ where: { rangoId, key: 'usuarios.gestionar' } })) !== null;
      if (!nuevoRangoTieneGestionar || !isActive) {
        const quedaAlguien = await this.rangos.quedaAlguienConGestionarUsuarios(tenantId, { excludeUserId: id });
        if (!quedaAlguien) throw new ConflictException('Tiene que quedar al menos un usuario activo que pueda gestionar usuarios');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { name, rangoId, isActive, branchId: asignacion.branchId, warehouseId: asignacion.warehouseId },
      include: { rango: { select: { name: true } }, branch: { select: { name: true } } },
    });
    return { id: updated.id, name: updated.name, email: updated.email, rangoId: updated.rangoId, rangoName: updated.rango.name, isActive: updated.isActive, branchId: updated.branchId, branch: updated.branch };
  }
}
