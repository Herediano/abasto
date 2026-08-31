import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';

@Controller('warehouses')
@UseGuards(JwtAuthGuard)
export class WarehousesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() request: AuthRequest) {
    return this.prisma.warehouse.findMany({ where: { tenantId: request.user.tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  @Post()
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : undefined;
    if (!name || !code) throw new BadRequestException('name y code son obligatorios');
    try { return await this.prisma.warehouse.create({ data: { tenantId: request.user.tenantId, name, code, address } }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El code ya existe en este tenant'); throw error; }
  }
}
