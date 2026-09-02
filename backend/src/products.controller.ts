import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req, Res, UnprocessableEntityException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';
import { parsePricesFile } from './price-import.util';
import { priceChange, type PriceHistoryEntry } from './price-history.util';

// Alicuotas de IVA vigentes en Argentina. El campo era decimal libre, lo que
// habilitaba cargar valores que despues rompen la facturacion.
export const TAX_RATES = [0, 2.5, 5, 10.5, 21, 27];

function parseOptionalDecimal(value: unknown, field: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new UnprocessableEntityException(`${field} debe ser un número mayor o igual a cero`);
  return n;
}

function assertTaxRate(value: number | null | undefined) {
  if (value === undefined || value === null) return;
  if (!TAX_RATES.includes(value)) throw new UnprocessableEntityException(`La alícuota de IVA debe ser una de: ${TAX_RATES.join(', ')}`);
}

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private money(value: string, field: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new UnprocessableEntityException(`${field} debe ser un número mayor o igual a cero`);
    return n;
  }

  @Get()
  async list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20));
    const search = query.search?.trim();
    // Se acumulan en AND porque barcode y search pueden venir juntos y cada uno
    // aporta su propio OR: puestos como claves sueltas, el segundo pisaría al primero.
    const filters: Prisma.ProductWhereInput[] = [];
    // Un producto puede tener codigos adicionales: el escaneo tiene que
    // encontrarlo tanto por el principal como por cualquiera de los otros.
    if (query.barcode) filters.push({ OR: [{ barcode: query.barcode }, { extraBarcodes: { some: { barcode: query.barcode } } }] });
    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { internalCode: { contains: search, mode: 'insensitive' } },
          { extraBarcodes: { some: { barcode: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }
    const where: Prisma.ProductWhereInput = {
      tenantId,
      ...(query.status === 'inactive' ? { isActive: false } : query.status === 'all' ? {} : { isActive: true }),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(filters.length ? { AND: filters } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: { category: { select: { name: true } } }, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.product.count({ where }),
    ]);
    return { items: items.map(p => ({ ...p, categoryName: p.category?.name ?? null, category: undefined })), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  @Get('low-stock')
  async lowStock(@Req() request: AuthRequest) {
    const tenantId = request.user.tenantId;
    const products = await this.prisma.product.findMany({ where: { tenantId, isActive: true, minStock: { not: null } } });
    if (!products.length) return [];
    const sums = await this.prisma.stockMovement.groupBy({ by: ['productId'], where: { tenantId, productId: { in: products.map(p => p.id) } }, _sum: { quantity: true } });
    const sumMap = new Map(sums.map(s => [s.productId, Number(s._sum.quantity ?? 0)]));
    return products
      .map(p => ({ ...p, currentStock: sumMap.get(p.id) ?? 0 }))
      .filter(p => p.currentStock < Number(p.minStock))
      .sort((a, b) => a.currentStock / Number(a.minStock) - b.currentStock / Number(b.minStock));
  }

  @Post('import-reference')
  @UseGuards(AdminGuard)
  async importReference(@Req() request: AuthRequest) {
    const tenantId = request.user.tenantId;
    const [reference, existing] = await Promise.all([
      this.prisma.productReference.findMany(),
      this.prisma.product.findMany({ where: { tenantId }, select: { barcode: true } }),
    ]);
    const existingBarcodes = new Set(existing.map(p => p.barcode));
    const toCreate = reference.filter(r => !existingBarcodes.has(r.ean));
    if (!toCreate.length) return { created: 0, skipped: reference.length };

    const [{ product_code_seq: newSeq }] = await this.prisma.$queryRaw<Array<{ product_code_seq: number }>>`
      UPDATE tenants SET product_code_seq = product_code_seq + ${toCreate.length} WHERE id = ${tenantId}::uuid RETURNING product_code_seq
    `;
    const startCode = newSeq - toCreate.length + 1;

    await this.prisma.product.createMany({
      data: toCreate.map((r, i) => ({
        tenantId,
        internalCode: String(startCode + i),
        barcode: r.ean,
        name: r.name,
        brand: r.brand ?? undefined,
        unit: 'unidad',
        salePrice: r.suggestedPrice ?? undefined,
        manejaVencimiento: false,
      })),
    });
    return { created: toCreate.length, skipped: reference.length - toCreate.length };
  }

  @Get('export')
  @UseGuards(AdminGuard)
  async export(@Req() request: AuthRequest, @Res() res: Response) {
    const products = await this.prisma.product.findMany({ where: { tenantId: request.user.tenantId, isActive: true }, orderBy: { name: 'asc' } });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mayorista ERP';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Precios', { views: [{ state: 'frozen', ySplit: 1 }] });

    sheet.columns = [
      { header: 'Código de barras', key: 'barcode', width: 20 },
      { header: 'Producto', key: 'name', width: 42 },
      { header: 'Precio de costo', key: 'costPrice', width: 18 },
      { header: 'Precio de venta', key: 'salePrice', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 22;

    for (const p of products) {
      const row = sheet.addRow({
        barcode: p.barcode,
        name: p.name,
        costPrice: p.costPrice ? Number(p.costPrice) : null,
        salePrice: p.salePrice ? Number(p.salePrice) : null,
      });
      row.getCell('costPrice').numFmt = '#,##0.00';
      row.getCell('salePrice').numFmt = '#,##0.00';
      row.font = { name: 'Calibri', size: 11 };
    }

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 4 } };
    for (let i = 2; i <= products.length + 1; i += 2) {
      sheet.getRow(i).eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="productos.xlsx"');
    res.send(Buffer.from(buffer));
  }

  @Post('import-prices')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  async importPrices(@Req() request: AuthRequest, @UploadedFile() file: Express.Multer.File, @Body() body: { updateNames?: string }) {
    if (!file) throw new BadRequestException('Subí un archivo .csv o .xlsx');
    const tenantId = request.user.tenantId;
    // Los nombres solo se tocan si el pedido lo pide explicitamente: un archivo de
    // precios que ademas traiga nombres no debe reescribir el catalogo por accidente.
    const updateNames = body?.updateNames === 'true';
    const { rows, matchedColumns } = await parsePricesFile(file.buffer, file.originalname);
    if (!matchedColumns.barcode) throw new UnprocessableEntityException('No pudimos identificar una columna de código de barras en el archivo. Revisá que tenga un encabezado como "Código de barras", "EAN" o "Barcode".');
    if (updateNames && !matchedColumns.name) throw new UnprocessableEntityException('Pediste actualizar los nombres pero no encontramos una columna de nombre. Revisá que tenga un encabezado como "Nombre nuevo", "Producto" o "Descripción".');
    if (!updateNames && !matchedColumns.costPrice && !matchedColumns.salePrice) throw new UnprocessableEntityException('No pudimos identificar ninguna columna de precio en el archivo. Revisá que tenga un encabezado como "Precio de costo" y/o "Precio de venta".');

    let updated = 0;
    let renamed = 0;
    const notFound: string[] = [];
    const invalid: string[] = [];
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const products = await this.prisma.product.findMany({ where: { tenantId, barcode: { in: batch.map(r => r.barcode) } }, select: { id: true, barcode: true, name: true, costPrice: true, salePrice: true } });
      const byBarcode = new Map(products.map(p => [p.barcode, p]));
      const updates: Prisma.PrismaPromise<unknown>[] = [];
      const historia: PriceHistoryEntry[] = [];
      for (const row of batch) {
        const current = byBarcode.get(row.barcode);
        if (!current) {
          notFound.push(row.barcode);
          continue;
        }
        let costPrice: number | undefined;
        let salePrice: number | undefined;
        try {
          costPrice = row.costPrice ? this.money(row.costPrice, 'costPrice') : undefined;
          salePrice = row.salePrice ? this.money(row.salePrice, 'salePrice') : undefined;
        } catch {
          invalid.push(row.barcode);
          continue;
        }
        const name = updateNames && row.name && row.name !== current.name ? row.name : undefined;
        if (costPrice === undefined && salePrice === undefined && name === undefined) continue;
        if (costPrice !== undefined) {
          const h = priceChange({ tenantId, productId: current.id, field: 'cost', before: current.costPrice, after: costPrice, source: 'import', userId: request.user.id });
          if (h) historia.push(h);
        }
        if (salePrice !== undefined) {
          const h = priceChange({ tenantId, productId: current.id, field: 'sale', before: current.salePrice, after: salePrice, source: 'import', userId: request.user.id });
          if (h) historia.push(h);
        }
        updates.push(this.prisma.product.update({
          where: { id: current.id },
          data: { ...(costPrice !== undefined ? { costPrice } : {}), ...(salePrice !== undefined ? { salePrice } : {}), ...(name !== undefined ? { name } : {}) },
        }));
        if (costPrice !== undefined || salePrice !== undefined) updated++;
        if (name !== undefined) renamed++;
      }
      if (historia.length) updates.push(this.prisma.productPriceHistory.createMany({ data: historia }));
      if (updates.length) await this.prisma.$transaction(updates);
    }
    return { updated, renamed, notFound, invalid, matchedColumns };
  }

  @Get(':id')
  async get(@Req() request: AuthRequest, @Param('id') id: string) {
    const product = await this.prisma.product.findFirstOrThrow({
      where: { id, tenantId: request.user.tenantId },
      include: {
        category: { select: { name: true } },
        extraBarcodes: { orderBy: { createdAt: 'asc' } },
        suppliers: { include: { supplier: { select: { name: true } } }, orderBy: { lastPurchaseAt: 'desc' } },
        priceHistory: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    return {
      ...product,
      categoryName: product.category?.name ?? null,
      category: undefined,
      suppliers: product.suppliers.map(s => ({ id: s.id, supplierId: s.supplierId, supplierName: s.supplier.name, supplierCode: s.supplierCode, lastCost: s.lastCost, lastPurchaseAt: s.lastPurchaseAt })),
    };
  }

  @Post(':id/barcodes')
  @UseGuards(AdminGuard)
  async addBarcode(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: { barcode?: unknown }) {
    const tenantId = request.user.tenantId;
    const barcode = typeof body.barcode === 'string' ? body.barcode.trim() : '';
    if (!barcode) throw new BadRequestException('El código de barras es obligatorio');
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new BadRequestException('Producto no encontrado');
    if (product.barcode === barcode) throw new ConflictException('Ese ya es el código principal del producto');
    try {
      return await this.prisma.productBarcode.create({ data: { tenantId, productId: id, barcode } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ese código de barras ya está en uso');
      throw error;
    }
  }

  @Delete(':id/barcodes/:barcodeId')
  @UseGuards(AdminGuard)
  async removeBarcode(@Req() request: AuthRequest, @Param('id') id: string, @Param('barcodeId') barcodeId: string) {
    const tenantId = request.user.tenantId;
    const found = await this.prisma.productBarcode.findFirst({ where: { id: barcodeId, tenantId, productId: id } });
    if (!found) throw new BadRequestException('Código de barras no encontrado');
    await this.prisma.productBarcode.delete({ where: { id: barcodeId } });
    return { deleted: true };
  }

  @Get(':id/lots')
  lots(@Req() request: AuthRequest, @Param('id') id: string) {
    const tenantId = request.user.tenantId;
    return this.prisma.productLot.findMany({ where: { tenantId, productId: id }, orderBy: [{ expirationDate: 'asc' }, { lotNumber: 'asc' }] });
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
    const providedLotNumber = typeof body.lotNumber === 'string' ? body.lotNumber.trim() : '';
    const warehouseId = typeof body.warehouseId === 'string' ? body.warehouseId : '';
    const supplierId = typeof body.supplierId === 'string' && body.supplierId ? body.supplierId : undefined;
    const expirationDate = typeof body.expirationDate === 'string' && body.expirationDate ? new Date(body.expirationDate) : undefined;
    const receivedAt = typeof body.receivedAt === 'string' && body.receivedAt ? new Date(body.receivedAt) : undefined;
    if (!warehouseId) throw new BadRequestException('warehouseId es obligatorio');
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new BadRequestException('Producto no encontrado');
    if (product.manejaVencimiento && !expirationDate) throw new UnprocessableEntityException('expirationDate es obligatorio para este producto');
    if (expirationDate && Number.isNaN(expirationDate.getTime())) throw new UnprocessableEntityException('expirationDate no es válida');
    if (receivedAt && Number.isNaN(receivedAt.getTime())) throw new UnprocessableEntityException('receivedAt no es válida');
    if (!(await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } }))) throw new BadRequestException('Depósito no encontrado');
    if (supplierId && !(await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId } }))) throw new BadRequestException('Proveedor no encontrado');

    if (providedLotNumber) {
      try { return await this.prisma.productLot.create({ data: { tenantId, productId: id, lotNumber: providedLotNumber, warehouseId, supplierId, expirationDate, receivedAt } }); }
      catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El lotNumber ya existe para este producto'); throw error; }
    }

    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `L-${datePart}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      try { return await this.prisma.productLot.create({ data: { tenantId, productId: id, lotNumber: candidate, warehouseId, supplierId, expirationDate, receivedAt } }); }
      catch (error) { if ((error as { code?: string }).code !== 'P2002') throw error; }
    }
    throw new ConflictException('No se pudo generar un identificador de lote único, intentá nuevamente');
  }

  @Post()
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    for (const field of ['barcode', 'name', 'unit']) if (typeof body[field] !== 'string' || !(body[field] as string).trim()) throw new BadRequestException(`${field} es obligatorio`);
    const costPrice = parseOptionalDecimal(body.costPrice, 'costPrice');
    const salePrice = parseOptionalDecimal(body.salePrice, 'salePrice');
    const minStock = parseOptionalDecimal(body.minStock, 'minStock');
    const taxRate = body.taxRate === undefined ? undefined : parseOptionalDecimal(body.taxRate, 'taxRate') ?? undefined;
    assertTaxRate(taxRate);
    const internalTaxRate = parseOptionalDecimal(body.internalTaxRate, 'internalTaxRate');
    const unitsPerPurchase = parseOptionalDecimal(body.unitsPerPurchase, 'unitsPerPurchase');
    if (unitsPerPurchase !== undefined && unitsPerPurchase !== null && unitsPerPurchase <= 0) throw new UnprocessableEntityException('Las unidades por bulto deben ser mayores a cero');
    const categoryId = typeof body.categoryId === 'string' && body.categoryId ? body.categoryId : undefined;
    if (categoryId && !(await this.prisma.category.findFirst({ where: { id: categoryId, tenantId } }))) throw new BadRequestException('Categoría no encontrada');

    const [{ product_code_seq: internalCode }] = await this.prisma.$queryRaw<Array<{ product_code_seq: number }>>`
      UPDATE tenants SET product_code_seq = product_code_seq + 1 WHERE id = ${tenantId}::uuid RETURNING product_code_seq
    `;

    try {
      return await this.prisma.product.create({ data: {
        tenantId, internalCode: String(internalCode), barcode: (body.barcode as string).trim(), name: (body.name as string).trim(), unit: (body.unit as string).trim(),
        categoryId,
        brand: typeof body.brand === 'string' ? body.brand : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        manejaVencimiento: body.manejaVencimiento === true,
        purchaseUnit: typeof body.purchaseUnit === 'string' && body.purchaseUnit.trim() ? body.purchaseUnit.trim() : undefined,
        unitsPerPurchase: unitsPerPurchase ?? undefined,
        internalTaxRate: internalTaxRate ?? undefined,
        costPrice: costPrice ?? undefined, salePrice: salePrice ?? undefined, taxRate, minStock: minStock ?? undefined,
      } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un producto con ese código de barras');
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const current = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!current) throw new BadRequestException('Producto no encontrado');
    const barcode = typeof body.barcode === 'string' ? body.barcode.trim() : current.barcode;
    const name = typeof body.name === 'string' ? body.name.trim() : current.name;
    const unit = typeof body.unit === 'string' ? body.unit.trim() : current.unit;
    if (!barcode || !name || !unit) throw new BadRequestException('barcode, name y unit son obligatorios');
    const costPrice = parseOptionalDecimal(body.costPrice, 'costPrice');
    const salePrice = parseOptionalDecimal(body.salePrice, 'salePrice');
    const minStock = parseOptionalDecimal(body.minStock, 'minStock');
    const taxRate = parseOptionalDecimal(body.taxRate, 'taxRate');
    assertTaxRate(taxRate);
    const internalTaxRate = parseOptionalDecimal(body.internalTaxRate, 'internalTaxRate');
    const unitsPerPurchase = parseOptionalDecimal(body.unitsPerPurchase, 'unitsPerPurchase');
    if (unitsPerPurchase !== undefined && unitsPerPurchase !== null && unitsPerPurchase <= 0) throw new UnprocessableEntityException('Las unidades por bulto deben ser mayores a cero');
    const categoryId = body.categoryId === null || body.categoryId === '' ? null : typeof body.categoryId === 'string' ? body.categoryId : current.categoryId;
    if (categoryId && !(await this.prisma.category.findFirst({ where: { id: categoryId, tenantId } }))) throw new BadRequestException('Categoría no encontrada');
    const nextCost = costPrice === undefined ? current.costPrice : costPrice;
    const nextSale = salePrice === undefined ? current.salePrice : salePrice;
    const historia = [
      priceChange({ tenantId, productId: id, field: 'cost', before: current.costPrice, after: nextCost, source: 'manual', userId: request.user.id }),
      priceChange({ tenantId, productId: id, field: 'sale', before: current.salePrice, after: nextSale, source: 'manual', userId: request.user.id }),
    ].filter((h): h is NonNullable<typeof h> => h !== null);

    try {
      const [updated] = await this.prisma.$transaction([
        this.prisma.product.update({ where: { id }, data: {
          barcode, name, unit,
          categoryId,
          brand: typeof body.brand === 'string' ? body.brand.trim() : null,
          description: typeof body.description === 'string' ? body.description.trim() : null,
          manejaVencimiento: typeof body.manejaVencimiento === 'boolean' ? body.manejaVencimiento : current.manejaVencimiento,
          isActive: typeof body.isActive === 'boolean' ? body.isActive : current.isActive,
          purchaseUnit: body.purchaseUnit === undefined ? current.purchaseUnit : (typeof body.purchaseUnit === 'string' && body.purchaseUnit.trim() ? body.purchaseUnit.trim() : null),
          unitsPerPurchase: unitsPerPurchase === undefined || unitsPerPurchase === null ? current.unitsPerPurchase : unitsPerPurchase,
          internalTaxRate: internalTaxRate === undefined || internalTaxRate === null ? current.internalTaxRate : internalTaxRate,
          costPrice: nextCost,
          salePrice: nextSale,
          minStock: minStock === undefined ? current.minStock : minStock,
          taxRate: taxRate === undefined ? current.taxRate : (taxRate ?? current.taxRate),
        } }),
        ...(historia.length ? [this.prisma.productPriceHistory.createMany({ data: historia })] : []),
      ]);
      return updated;
    }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El barcode ya existe'); throw error; }
  }
}
