import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Param, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
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

  @Post(':id/lots')
  async createLot(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const lotNumber = typeof body.lotNumber === 'string' ? body.lotNumber.trim() : '';
    const warehouseId = typeof body.warehouseId === 'string' ? body.warehouseId : '';
    const supplierId = typeof body.supplierId === 'string' && body.supplierId ? body.supplierId : undefined;
    const expirationDate = typeof body.expirationDate === 'string' && body.expirationDate ? new Date(body.expirationDate) : undefined;
    const receivedAt = typeof body.receivedAt === 'string' && body.receivedAt ? new Date(body.receivedAt) : undefined;
    if (!lotNumber || !warehouseId) throw new BadRequestException('lotNumber y warehouseId son obligatorios');
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new BadRequestException('Producto no encontrado');
    if (product.manejaVencimiento && !expirationDate) throw new UnprocessableEntityException('expirationDate es obligatorio para este producto');
    if (expirationDate && Number.isNaN(expirationDate.getTime())) throw new UnprocessableEntityException('expirationDate no es válida');
    if (receivedAt && Number.isNaN(receivedAt.getTime())) throw new UnprocessableEntityException('receivedAt no es válida');
    if (!(await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } }))) throw new BadRequestException('Depósito no encontrado');
    if (supplierId && !(await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId } }))) throw new BadRequestException('Proveedor no encontrado');
    try { return await this.prisma.productLot.create({ data: { tenantId, productId: id, lotNumber, warehouseId, supplierId, expirationDate, receivedAt } }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El lotNumber ya existe para este producto'); throw error; }
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
