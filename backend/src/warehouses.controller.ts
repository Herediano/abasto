import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { sendExport } from './export.util';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarehousesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get() @RequirePermission('depositos.ver')
  async list(@Req() request: AuthRequest, @Query('includeInactive') includeInactive?: string) {
    const tenantId = request.user.tenantId;
    const all = includeInactive === '1' || includeInactive === 'true';
    const rows = await this.prisma.warehouse.findMany({
      where: { tenantId, ...(all ? {} : { isActive: true }) },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { branch: { select: { id: true, name: true } }, _count: { select: { users: true, cashRegisters: true } } },
    });
    if (!all) return rows;
    // Un depósito con caja o con gente asignada es el operativo de su sucursal: no se puede desactivar sin dejarla sin dónde vender.
    return rows.map(w => ({ ...w, canDeactivate: w.isActive && w._count.users === 0 && w._count.cashRegisters === 0 }));
  }

  @Get('export') @RequirePermission('depositos.ver')
  async export(@Req() request: AuthRequest, @Res() res: Response, @Query('format') format?: string) {
    const rows = await this.prisma.warehouse.findMany({
      where: { tenantId: request.user.tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: { branch: { select: { name: true } } },
    });
    await sendExport(
      res,
      format,
      'depositos',
      [
        { header: 'Depósito', key: 'name', width: 28 },
        { header: 'Código', key: 'code', width: 14 },
        { header: 'Sucursal', key: 'branch', width: 24 },
        { header: 'Dirección', key: 'address', width: 32 },
      ],
      rows.map(w => ({ name: w.name, code: w.code, branch: w.branch?.name ?? '', address: w.address ?? '' })),
    );
  }

  @Post()
  @RequirePermission('depositos.crear')
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : undefined;
    const branchId = typeof body.branchId === 'string' ? body.branchId : '';
    if (!name || !code) throw new BadRequestException('name y code son obligatorios');
    if (!branchId) throw new BadRequestException('Elegí a qué sucursal pertenece el depósito');
    if (!(await this.prisma.branch.findFirst({ where: { id: branchId, tenantId: request.user.tenantId, isActive: true } }))) {
      throw new BadRequestException('Sucursal no encontrada');
    }
    try {
      // Un depósito extra es sólo espacio de guardado: la caja vive en la
      // sucursal, que ya tiene la suya. No se crea una caja acá.
      return await this.prisma.warehouse.create({ data: { tenantId: request.user.tenantId, branchId, name, code, address } });
    }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El code ya existe en este tenant'); throw error; }
  }
  @Put(':id')
  @RequirePermission('depositos.editar')
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!name || !code) throw new BadRequestException('name y code son obligatorios');
    const current = await this.prisma.warehouse.findFirst({ where: { id, tenantId }, include: { _count: { select: { users: true, cashRegisters: true } } } });
    if (!current) throw new BadRequestException('Depósito no encontrado');

    const data: Record<string, unknown> = { name, code, address: typeof body.address === 'string' ? body.address.trim() : null };
    if (typeof body.isActive === 'boolean' && body.isActive !== current.isActive) {
      if (!body.isActive) {
        if (current._count.users > 0) throw new ConflictException('Reasigná los usuarios de este depósito antes de desactivarlo');
        if (current._count.cashRegisters > 0) throw new ConflictException('Este depósito tiene una caja: es el operativo de su sucursal, no se puede desactivar');
      }
      data.isActive = body.isActive;
    }

    try { return await this.prisma.warehouse.update({ where: { id }, data }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El código de depósito ya existe'); throw error; }
  }
}
