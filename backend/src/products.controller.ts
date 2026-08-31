import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('products')
export class ProductsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private tenantId(headers: Record<string, string | string[] | undefined>) {
    const value = headers['x-tenant-id'];
    const id = Array.isArray(value) ? value[0] : value;
    if (!id) throw new BadRequestException('Falta el header x-tenant-id');
    return id;
  }

  @Get()
  list(@Headers() headers: Record<string, string | string[] | undefined>) {
    return this.prisma.product.findMany({ where: { tenantId: this.tenantId(headers) }, orderBy: { name: 'asc' } });
  }

  @Get(':id')
  get(@Headers() headers: Record<string, string | string[] | undefined>, @Param('id') id: string) {
    return this.prisma.product.findFirstOrThrow({ where: { id, tenantId: this.tenantId(headers) } });
  }

  @Get(':id/lots')
  lots(@Headers() headers: Record<string, string | string[] | undefined>, @Param('id') id: string) {
    const tenantId = this.tenantId(headers);
    return this.prisma.productLot.findMany({ where: { tenantId, productId: id }, orderBy: { lotNumber: 'asc' } });
  }

  @Post()
  create(@Headers() headers: Record<string, string | string[] | undefined>, @Body() body: Record<string, unknown>) {
    const tenantId = this.tenantId(headers);
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
