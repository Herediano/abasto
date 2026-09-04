import { Controller, Get, Inject, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './require-permission.decorator';

@Controller('product-reference')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProductReferenceController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get(':ean') @RequirePermission('productos.crear')
  async get(@Param('ean') ean: string) {
    const found = await this.prisma.productReference.findUnique({ where: { ean } });
    if (!found) throw new NotFoundException('Sin datos de referencia para este código de barras');
    return found;
  }
}
