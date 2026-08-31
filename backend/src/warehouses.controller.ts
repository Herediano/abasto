import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
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
}
