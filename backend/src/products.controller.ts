import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() request: AuthRequest) {
    return this.prisma.product.findMany({ where: { tenantId: request.user.tenantId }, orderBy: { name: 'asc' } });
  }

  @Get(':id')
  get(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.prisma.product.findFirstOrThrow({ where: { id, tenantId: request.user.tenantId } });
  }

  @Get(':id/lots')
  lots(@Req() request: AuthRequest, @Param('id') id: string) {
    const tenantId = request.user.tenantId;
    return this.prisma.productLot.findMany({ where: { tenantId, productId: id }, orderBy: { lotNumber: 'asc' } });
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    for (const field of ['sku', 'name', 'unit']) if (typeof body[field] !== 'string' || !(body[field] as string).trim()) throw new BadRequestException(`${field} es obligatorio`);
    return this.prisma.product.create({ data: {
      tenantId, sku: (body.sku as string).trim(), name: (body.name as string).trim(), unit: (body.unit as string).trim(),
      barcode: typeof body.barcode === 'string' ? body.barcode : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      brand: typeof body.brand === 'string' ? body.brand : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      manejaVencimiento: body.manejaVencimiento === true,
    } });
  }
}
