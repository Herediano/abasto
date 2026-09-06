import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Inject, NotFoundException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';

/** El rango de fábrica que administra la empresa; único que da de alta sucursales. */
const OWNER_RANGO = 'Dueño';

@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BranchesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Lista de sucursales. Por defecto sólo las activas (selector de sucursal, alta
   * de depósitos); con `?includeInactive=1` trae todas y agrega, por sucursal,
   * cuántos depósitos y usuarios tiene y si se puede eliminar (Ajustes).
   */
  @Get()
  async list(@Req() request: AuthRequest, @Query('includeInactive') includeInactive?: string) {
    const tenantId = request.user.tenantId;
    const all = includeInactive === '1' || includeInactive === 'true';
    const rows = await this.prisma.branch.findMany({
      where: { tenantId, ...(all ? {} : { isActive: true }) },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { warehouses: true, users: true } } },
    });
    if (!all) return rows;
    // ¿Se puede borrar de verdad? Sólo si no tiene usuarios, ni ventas, ni stock, ni turnos.
    const activas = rows.filter(b => b.isActive).length;
    return Promise.all(
      rows.map(async b => {
        const whIds = (await this.prisma.warehouse.findMany({ where: { tenantId, branchId: b.id }, select: { id: true } })).map(w => w.id);
        const [ventas, movs, turnos] = await Promise.all([
          this.prisma.sale.count({ where: { tenantId, warehouseId: { in: whIds } } }),
          this.prisma.stockMovement.count({ where: { tenantId, warehouseId: { in: whIds } } }),
          this.prisma.cashShift.count({ where: { tenantId, cashRegister: { warehouseId: { in: whIds } } } }),
        ]);
        const vacia = b._count.users === 0 && ventas === 0 && movs === 0 && turnos === 0;
        return { ...b, canDelete: vacia && rows.length > 1, canDeactivate: b.isActive && b._count.users === 0 && activas > 1 };
      }),
    );
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    this.soloDueno(request);
    const { name, code, address } = this.parse(body);
    return this.crear(request.user.tenantId, name, code, address);
  }

  @Put(':id')
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    this.soloDueno(request);
    const tenantId = request.user.tenantId;
    const branch = await this.prisma.branch.findFirst({ where: { id, tenantId }, include: { _count: { select: { users: true } } } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');

    const data: Record<string, unknown> = {};
    if (body.name !== undefined || body.code !== undefined || body.address !== undefined) {
      const p = this.parse({ name: body.name ?? branch.name, code: body.code ?? branch.code, address: body.address ?? branch.address });
      Object.assign(data, p);
    }
    if (typeof body.isActive === 'boolean' && body.isActive !== branch.isActive) {
      if (!body.isActive) {
        if (branch._count.users > 0) throw new ConflictException('Reasigná los usuarios de esta sucursal antes de desactivarla');
        if ((await this.prisma.branch.count({ where: { tenantId, isActive: true } })) <= 1) throw new ConflictException('Tiene que quedar al menos una sucursal activa');
      }
      data.isActive = body.isActive;
    }

    try {
      await this.prisma.branch.update({ where: { id }, data });
      return this.prisma.branch.findFirstOrThrow({ where: { id, tenantId } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya hay una sucursal con ese código');
      throw error;
    }
  }

  /** Elimina una sucursal vacía (sin usuarios, ventas, stock ni turnos); si tiene movimiento, desactivala. */
  @Delete(':id')
  async remove(@Req() request: AuthRequest, @Param('id') id: string) {
    this.soloDueno(request);
    const tenantId = request.user.tenantId;
    const branch = await this.prisma.branch.findFirst({ where: { id, tenantId }, include: { _count: { select: { users: true } } } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    if ((await this.prisma.branch.count({ where: { tenantId } })) <= 1) throw new ConflictException('No podés eliminar la única sucursal');
    if (branch._count.users > 0) throw new ConflictException('Tiene usuarios asignados. Reasignalos primero, o desactivá la sucursal');

    const whIds = (await this.prisma.warehouse.findMany({ where: { tenantId, branchId: id }, select: { id: true } })).map(w => w.id);
    const [ventas, movs, turnos] = await Promise.all([
      this.prisma.sale.count({ where: { tenantId, warehouseId: { in: whIds } } }),
      this.prisma.stockMovement.count({ where: { tenantId, warehouseId: { in: whIds } } }),
      this.prisma.cashShift.count({ where: { tenantId, cashRegister: { warehouseId: { in: whIds } } } }),
    ]);
    if (ventas || movs || turnos) throw new ConflictException('La sucursal ya tiene movimiento (ventas, stock o turnos). Desactivala en vez de eliminarla');

    await this.prisma.$transaction(async tx => {
      await tx.cashRegister.deleteMany({ where: { tenantId, warehouseId: { in: whIds } } });
      await tx.warehouse.deleteMany({ where: { tenantId, branchId: id } });
      await tx.branch.delete({ where: { id } });
    });
    return { deleted: true };
  }

  private soloDueno(request: AuthRequest) {
    if (request.user.rangoName !== OWNER_RANGO) throw new ForbiddenException('Sólo el Dueño puede administrar sucursales');
  }

  private parse(body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const address = typeof body.address === 'string' && body.address.trim() ? body.address.trim() : null;
    if (!name || !code) throw new BadRequestException('name y code son obligatorios');
    return { name, code, address };
  }

  /** Una sucursal nace operable: con su depósito y su caja, igual que al crear la empresa. */
  private async crear(tenantId: string, name: string, code: string, address: string | null) {
    try {
      return await this.prisma.$transaction(async tx => {
        const sucursal = await tx.branch.create({ data: { tenantId, name, code, address } });
        const deposito = await tx.warehouse.create({ data: { tenantId, branchId: sucursal.id, name: 'Depósito', code: `${code}-DEP` } });
        await tx.cashRegister.create({ data: { tenantId, warehouseId: deposito.id, name: 'Caja 1' } });
        return sucursal;
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya hay una sucursal o un depósito con ese código');
      throw error;
    }
  }
}
