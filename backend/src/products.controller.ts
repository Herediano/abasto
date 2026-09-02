import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Param, Post, Put, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';

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

  @Put(':id/lots/:lotId')
  @UseGuards(AdminGuard)
  async updateLot(@Req() request: AuthRequest, @Param('id') id: string, @Param('lotId') lotId: string, @Body() body: Record<string, unknown>) {
    const current = await this.prisma.productLot.findFirst({ where: { id: lotId, productId: id, tenantId: request.user.tenantId } });
    if (!current) throw new BadRequestException('Lote no encontrado');
    const lotNumber = typeof body.lotNumber === 'string' ? body.lotNumber.trim() : current.lotNumber;
    const warehouseId = typeof body.warehouseId === 'string' ? body.warehouseId : current.warehouseId;
    const expirationDate = body.expirationDate === null || body.expirationDate === '' ? null : typeof body.expirationDate === 'string' ? new Date(body.expirationDate) : current.expirationDate;
    const receivedAt = body.receivedAt === null || body.receivedAt === '' ? null : typeof body.receivedAt === 'string' ? new Date(body.receivedAt) : current.receivedAt;
    if (!lotNumber || Number.isNaN(expirationDate?.getTime()) || Number.isNaN(receivedAt?.getTime())) throw new UnprocessableEntityException('Los datos del lote no son válidos');
    const product = await this.prisma.product.findFirst({ where: { id, tenantId: request.user.tenantId } });
    if (product?.manejaVencimiento && !expirationDate) throw new UnprocessableEntityException('expirationDate es obligatorio para este producto');
    if (!(await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId: request.user.tenantId } }))) throw new BadRequestException('Depósito no encontrado');
    const supplierId = body.supplierId === null || body.supplierId === '' ? null : typeof body.supplierId === 'string' ? body.supplierId : current.supplierId;
    if (supplierId && !(await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId: request.user.tenantId } }))) throw new BadRequestException('Proveedor no encontrado');
    try { return await this.prisma.productLot.update({ where: { id: lotId }, data: { lotNumber, warehouseId, supplierId, expirationDate, receivedAt } }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El lotNumber ya existe para este producto'); throw error; }
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
    for (const field of ['barcode', 'name', 'unit']) if (typeof body[field] !== 'string' || !(body[field] as string).trim()) throw new BadRequestException(`${field} es obligatorio`);
    return this.prisma.product.create({ data: {
      tenantId, internalCode: typeof body.internalCode === 'string' && body.internalCode.trim() ? body.internalCode.trim() : undefined, barcode: (body.barcode as string).trim(), name: (body.name as string).trim(), unit: (body.unit as string).trim(),
      category: typeof body.category === 'string' ? body.category : undefined,
      brand: typeof body.brand === 'string' ? body.brand : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      manejaVencimiento: body.manejaVencimiento === true,
    } });
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const current = await this.prisma.product.findFirst({ where: { id, tenantId: request.user.tenantId } });
    if (!current) throw new BadRequestException('Producto no encontrado');
    const barcode = typeof body.barcode === 'string' ? body.barcode.trim() : current.barcode;
    const name = typeof body.name === 'string' ? body.name.trim() : current.name;
    const unit = typeof body.unit === 'string' ? body.unit.trim() : current.unit;
    if (!barcode || !name || !unit) throw new BadRequestException('barcode, name y unit son obligatorios');
    try { return await this.prisma.product.update({ where: { id }, data: { barcode, internalCode: typeof body.internalCode === 'string' && body.internalCode.trim() ? body.internalCode.trim() : null, name, unit, category: typeof body.category === 'string' ? body.category.trim() : null, brand: typeof body.brand === 'string' ? body.brand.trim() : null, description: typeof body.description === 'string' ? body.description.trim() : null, manejaVencimiento: typeof body.manejaVencimiento === 'boolean' ? body.manejaVencimiento : current.manejaVencimiento } }); }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El barcode o código interno ya existe'); throw error; }
  }
}
