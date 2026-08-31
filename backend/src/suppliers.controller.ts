import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get() list(@Req() request: AuthRequest) { return this.prisma.supplier.findMany({ where: { tenantId: request.user.tenantId, isActive: true }, orderBy: { name: 'asc' } }); }
}
