import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Inject, NotFoundException, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
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

  /** Lista de sucursales: la usa el selector de sucursal y el alta de depósitos. Sólo pide sesión. */
  @Get()
  list(@Req() request: AuthRequest) {
    return this.prisma.branch.findMany({
      where: { tenantId: request.user.tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { warehouses: true } } },
    });
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
    const { name, code, address } = this.parse(body);
    try {
      const result = await this.prisma.branch.updateMany({
        where: { id, tenantId: request.user.tenantId, isActive: true },
        data: { name, code, address },
      });
      if (!result.count) throw new NotFoundException('Sucursal no encontrada');
      return this.prisma.branch.findFirstOrThrow({ where: { id, tenantId: request.user.tenantId } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya hay una sucursal con ese código');
      throw error;
    }
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
