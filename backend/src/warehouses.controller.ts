import { Controller, Get, Headers, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('warehouses')
export class WarehousesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  list(@Headers() headers: Record<string, string | string[] | undefined>) {
    const value = headers['x-tenant-id'];
    const tenantId = Array.isArray(value) ? value[0] : value;
    if (!tenantId) throw new BadRequestException('Falta el header x-tenant-id');
    return this.prisma.warehouse.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }
}
