import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';

@Controller('warehouses')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarehousesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get() @RequirePermission('depositos.ver')
  list(@Req() request: AuthRequest) {
    return this.prisma.warehouse.findMany({
      where: { tenantId: request.user.tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: { branch: { select: { id: true, name: true } } },
    });
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
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!name || !code) throw new BadRequestException('name y code son obligatorios');
    try { return await this.prisma.warehouse.updateMany({ where: { id, tenantId: request.user.tenantId, isActive: true }, data: { name, code, address: typeof body.address === 'string' ? body.address.trim() : null } }).then(async result => { if (!result.count) throw new BadRequestException('Depósito no encontrado'); return this.prisma.warehouse.findFirstOrThrow({ where: { id, tenantId: request.user.tenantId } }); }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El código de depósito ya existe'); throw error; }
  }
}
