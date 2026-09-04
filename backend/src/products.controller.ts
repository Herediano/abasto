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
import { guardarPrecio, resolverPrecios } from './price-resolver.util';
import { buscarProductoIds } from './product-search.util';

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

  // Filtros compartidos entre el listado y la exportacion, para que "Exportar a
  // Excel" respete exactamente lo que el usuario esta viendo en pantalla.
  /**
   * `searchIds` viene resuelto aparte (product-search.util) porque la búsqueda
   * necesita SQL crudo: tolera acentos, abreviaturas y errores de tipeo, y
   * ordena por relevancia. Acá sólo se acota el conjunto.
   */
  private listWhere(tenantId: string, query: Record<string, string | undefined>, searchIds?: string[]): Prisma.ProductWhereInput {
    // Se acumulan en AND porque barcode y search pueden venir juntos y cada uno
    // aporta su propio OR: puestos como claves sueltas, el segundo pisaría al primero.
    const filters: Prisma.ProductWhereInput[] = [];
    // Un producto puede tener codigos adicionales: el escaneo tiene que
    // encontrarlo tanto por el principal como por cualquiera de los otros.
    if (query.barcode) filters.push({ OR: [{ barcode: query.barcode }, { extraBarcodes: { some: { barcode: query.barcode } } }] });
    // Un pesable se escanea con el código de balanza (peso embebido), que no es
    // el barcode del producto: se resuelve el producto por su código interno.
    if (query.internalCode) filters.push({ internalCode: query.internalCode });
    if (searchIds) filters.push({ id: { in: searchIds } });
    return {
      tenantId,
      ...(query.status === 'inactive' ? { isActive: false } : query.status === 'all' ? {} : { isActive: true }),
      ...(query.categoryId === 'none' ? { categoryId: null } : query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brand ? { brand: query.brand } : {}),
      ...(query.priced === 'yes' ? { salePrice: { not: null } } : query.priced === 'no' ? { salePrice: null } : {}),
      ...(filters.length ? { AND: filters } : {}),
    };
  }

  private listOrderBy(sort: string | undefined): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'newest': return { createdAt: 'desc' };
      case 'updated': return { updatedAt: 'desc' };
      case 'price_asc': return { salePrice: 'asc' };
      case 'price_desc': return { salePrice: 'desc' };
      default: return { name: 'asc' };
    }
  }

  // Stock actual = SUM(quantity) del ledger. Una sola consulta agrupada para todo
  // el conjunto de ids que se pida.
  private async stockMap(tenantId: string, productIds: string[]): Promise<Map<string, number>> {
    if (!productIds.length) return new Map();
    const sums = await this.prisma.stockMovement.groupBy({ by: ['productId'], where: { tenantId, productId: { in: productIds } }, _sum: { quantity: true } });
    return new Map(sums.map(s => [s.productId, Number(s._sum.quantity ?? 0)]));
  }

  @Get()
  async list(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20));
    const consulta = query.search?.trim();
    const searchIds = consulta ? await buscarProductoIds(this.prisma, tenantId, consulta) : undefined;
    // Si buscó y no hubo ni una coincidencia, no hay nada que listar: sin esto
    // un `id: { in: [] }` devolvería vacío igual, pero ahorra las consultas.
    if (searchIds && !searchIds.length) {
      return { items: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
    }
    const where = this.listWhere(tenantId, query, searchIds);
    const orderBy = this.listOrderBy(query.sort);
    const stockFilter = query.stock === 'low' || query.stock === 'out' ? query.stock : undefined;

    // Con priceListId se muestra el precio de esa lista (resuelto, incluida la
    // derivacion) en vez del de la lista base que cachea Product.salePrice.
    const listaPedida = query.priceListId
      ? await this.prisma.priceList.findFirst({ where: { id: query.priceListId, tenantId }, select: { id: true, isDefault: true } })
      : null;
    if (query.priceListId && !listaPedida) throw new BadRequestException('Lista de precios no encontrada');

    const shape = async (items: Array<{ id: string; category?: { name: string } | null }>, stock: Map<string, number>, total: number) => {
      const deLista = listaPedida && !listaPedida.isDefault
        ? await resolverPrecios(this.prisma, tenantId, items.map(i => i.id), listaPedida.id)
        : null;
      return {
        items: items.map(p => ({
          ...p,
          categoryName: p.category?.name ?? null,
          category: undefined,
          currentStock: stock.get(p.id) ?? 0,
          ...(deLista ? { salePrice: deLista.get(p.id) ?? null } : {}),
        })),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    };

    // "Stock bajo" / "Sin stock" dependen de un SUM que no vive en la tabla, asi
    // que se resuelve el universo completo, se filtra en memoria y recien ahi se pagina.
    if (stockFilter) {
      const candidates = await this.prisma.product.findMany({ where, select: { id: true, minStock: true } });
      const stockAll = await this.stockMap(tenantId, candidates.map(c => c.id));
      const matchIds = candidates
        .filter(c => {
          const s = stockAll.get(c.id) ?? 0;
          return stockFilter === 'out' ? s <= 0 : c.minStock != null && s < Number(c.minStock);
        })
        .map(c => c.id);
      const items = await this.prisma.product.findMany({ where: { id: { in: matchIds } }, include: { category: { select: { name: true } } }, orderBy, skip: (page - 1) * pageSize, take: pageSize });
      return await shape(items, stockAll, matchIds.length);
    }

    // Buscando y sin un orden pedido a mano, manda la relevancia: lo más
    // parecido a lo que se escribió va primero. Prisma no sabe ordenar por la
    // posición en un arreglo, así que se pagina sobre los ids ya rankeados.
    if (searchIds && !query.sort) {
      const permitidos = new Set((await this.prisma.product.findMany({ where, select: { id: true } })).map(p => p.id));
      const ordenados = searchIds.filter(id => permitidos.has(id));
      const pagina = ordenados.slice((page - 1) * pageSize, page * pageSize);
      const filas = await this.prisma.product.findMany({ where: { id: { in: pagina } }, include: { category: { select: { name: true } } } });
      const porId = new Map(filas.map(f => [f.id, f]));
      const items = pagina.map(id => porId.get(id)).filter((f): f is (typeof filas)[number] => !!f);
      return await shape(items, await this.stockMap(tenantId, pagina), ordenados.length);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: { category: { select: { name: true } } }, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.product.count({ where }),
    ]);
    return await shape(items, await this.stockMap(tenantId, items.map(i => i.id)), total);
  }

  @Get('brands')
  async brands(@Req() request: AuthRequest) {
    const rows = await this.prisma.product.findMany({
      where: { tenantId: request.user.tenantId, brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return rows.map(r => r.brand).filter((b): b is string => !!b);
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

    if (toCreate.length) {
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
          manejaVencimiento: false,
          fromReferenceCatalog: true,
        })),
      });
    }
    return { created: toCreate.length, skipped: reference.length - toCreate.length };
  }

  /** Revierte la carga del catálogo: borra los productos que vinieron de
   *  import-reference y que nunca tuvieron actividad (stock, venta o compra).
   *  Los que ya se usaron quedan intactos. */
  @Post('clear-reference-catalog')
  @UseGuards(AdminGuard)
  async clearReferenceCatalog(@Req() request: AuthRequest) {
    const tenantId = request.user.tenantId;
    const candidates = await this.prisma.product.findMany({
      where: { tenantId, fromReferenceCatalog: true },
      select: { id: true },
    });
    if (!candidates.length) return { deleted: 0, kept: 0 };
    const ids = candidates.map(c => c.id);

    const [moves, sales, purchases] = await Promise.all([
      this.prisma.stockMovement.findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ['productId'] }),
      this.prisma.saleLine.findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ['productId'] }),
      this.prisma.purchaseInvoiceLine.findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ['productId'] }),
    ]);
    const conActividad = new Set([...moves, ...sales, ...purchases].map(x => x.productId));
    const borrables = ids.filter(id => !conActividad.has(id));

    // ProductPrice / PriceTier / ProductBarcode / ProductSupplier / historial
    // tienen onDelete: Cascade, así que alcanza con borrar el producto.
    if (borrables.length) {
      await this.prisma.product.deleteMany({ where: { tenantId, id: { in: borrables } } });
    }
    return { deleted: borrables.length, kept: ids.length - borrables.length };
  }

  @Get('export')
  @UseGuards(AdminGuard)
  async export(@Req() request: AuthRequest, @Res() res: Response, @Query() query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    // El export tiene que respetar exactamente lo que se está viendo, búsqueda incluida.
    const consultaExport = query.search?.trim();
    const where = this.listWhere(tenantId, query, consultaExport ? await buscarProductoIds(this.prisma, tenantId, consultaExport) : undefined);
    const orderBy = this.listOrderBy(query.sort);
    let products = await this.prisma.product.findMany({
      where,
      include: { category: { select: { name: true } }, extraBarcodes: { select: { barcode: true }, orderBy: { createdAt: 'asc' } } },
      orderBy,
    });
    const stock = await this.stockMap(tenantId, products.map(p => p.id));
    if (query.stock === 'low' || query.stock === 'out') {
      products = products.filter(p => {
        const s = stock.get(p.id) ?? 0;
        return query.stock === 'out' ? s <= 0 : p.minStock != null && s < Number(p.minStock);
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mayorista ERP';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Productos', { views: [{ state: 'frozen', ySplit: 1 }] });

    // "Código de barras", "Producto", "Precio de costo" y "Precio de venta"
    // conservan su encabezado exacto para que la planilla siga sirviendo como
    // base del reimporte de precios (products/import-prices).
    sheet.columns = [
      { header: 'Código interno', key: 'internalCode', width: 14 },
      { header: 'Código de barras', key: 'barcode', width: 18 },
      { header: 'Códigos adicionales', key: 'extraBarcodes', width: 24 },
      { header: 'Producto', key: 'name', width: 42 },
      { header: 'Marca', key: 'brand', width: 18 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Unidad de venta', key: 'unit', width: 14 },
      { header: 'Unidad de compra', key: 'purchaseUnit', width: 16 },
      { header: 'Unidades por bulto', key: 'unitsPerPurchase', width: 16 },
      { header: 'Precio de costo', key: 'costPrice', width: 16 },
      { header: 'Precio de venta', key: 'salePrice', width: 16 },
      { header: 'Margen %', key: 'margin', width: 12 },
      { header: 'IVA %', key: 'taxRate', width: 10 },
      { header: 'Imp. internos %', key: 'internalTaxRate', width: 14 },
      { header: 'Stock actual', key: 'currentStock', width: 13 },
      { header: 'Stock mínimo', key: 'minStock', width: 13 },
      { header: 'Maneja vencimiento', key: 'manejaVencimiento', width: 18 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Creado', key: 'createdAt', width: 18 },
      { header: 'Actualizado', key: 'updatedAt', width: 18 },
    ];
    const lastCol = sheet.columnCount;

    const headerRow = sheet.getRow(1);
    headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.height = 22;

    for (const p of products) {
      const cost = p.costPrice ? Number(p.costPrice) : null;
      const sale = p.salePrice ? Number(p.salePrice) : null;
      const row = sheet.addRow({
        internalCode: p.internalCode ?? '',
        barcode: p.barcode,
        extraBarcodes: p.extraBarcodes.map(b => b.barcode).join(' / '),
        name: p.name,
        brand: p.brand ?? '',
        category: p.category?.name ?? '',
        unit: p.unit,
        purchaseUnit: p.purchaseUnit ?? '',
        unitsPerPurchase: Number(p.unitsPerPurchase),
        costPrice: cost,
        salePrice: sale,
        margin: cost != null && sale != null && sale > 0 ? (sale - cost) / sale : null,
        taxRate: Number(p.taxRate),
        internalTaxRate: Number(p.internalTaxRate),
        currentStock: stock.get(p.id) ?? 0,
        minStock: p.minStock != null ? Number(p.minStock) : null,
        manejaVencimiento: p.manejaVencimiento ? 'Sí' : 'No',
        status: p.isActive ? 'Activo' : 'Inactivo',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      });
      row.getCell('costPrice').numFmt = '#,##0.00';
      row.getCell('salePrice').numFmt = '#,##0.00';
      row.getCell('margin').numFmt = '0.0%';
      row.getCell('currentStock').numFmt = '#,##0.###';
      row.getCell('minStock').numFmt = '#,##0.###';
      row.getCell('createdAt').numFmt = 'dd/mm/yyyy';
      row.getCell('updatedAt').numFmt = 'dd/mm/yyyy';
      row.font = { name: 'Calibri', size: 11 };
    }

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: lastCol } };
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

    // Los precios de venta se escriben en la lista base, que es la que la caja
    // resuelve al cobrar. Sin lista base no hay dónde ponerlos.
    const listaBase = await this.prisma.priceList.findFirst({ where: { tenantId, isDefault: true }, select: { id: true } });
    if (!listaBase) throw new UnprocessableEntityException('No hay una lista de precios base configurada. Creá una en Precios antes de importar.');

    let updated = 0;
    let renamed = 0;
    const notFound: string[] = [];
    const invalid: string[] = [];
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const products = await this.prisma.product.findMany({ where: { tenantId, barcode: { in: batch.map(r => r.barcode) } }, select: { id: true, barcode: true, name: true, costPrice: true, salePrice: true } });
      const byBarcode = new Map(products.map(p => [p.barcode, p]));
      const cambiosProducto: { id: string; data: Prisma.ProductUpdateInput }[] = [];
      const ventas: { productId: string; price: number }[] = [];
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
        // El costo es un campo del producto. El precio de venta NO: vive en
        // ProductPrice, que es de donde la caja resuelve cuánto cobrar. Escribir
        // sólo la caché Product.salePrice dejaba productos que se veían con
        // precio en el listado pero salían "sin precio" al vender.
        if (costPrice !== undefined || name !== undefined) {
          cambiosProducto.push({
            id: current.id,
            data: { ...(costPrice !== undefined ? { costPrice } : {}), ...(name !== undefined ? { name } : {}) },
          });
        }
        if (salePrice !== undefined) ventas.push({ productId: current.id, price: salePrice });
        if (costPrice !== undefined || salePrice !== undefined) updated++;
        if (name !== undefined) renamed++;
      }

      if (cambiosProducto.length || ventas.length || historia.length) {
        await this.prisma.$transaction(async tx => {
          for (const c of cambiosProducto) await tx.product.update({ where: { id: c.id }, data: c.data });
          // guardarPrecio crea la fila de ProductPrice en la lista base y, de
          // paso, refresca la caché Product.salePrice.
          for (const v of ventas) {
            await guardarPrecio(tx, { tenantId, productId: v.productId, priceListId: listaBase.id, price: v.price, source: 'import', userId: request.user.id });
          }
          if (historia.length) await tx.productPriceHistory.createMany({ data: historia });
        });
      }
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

  /**
   * Escalas por cantidad: a partir de minQty rige otro precio. Se configuran acá
   * y las consume Ventas; hoy no afectan ningún cálculo.
   */
  @Get(':id/tiers')
  async tiers(@Req() request: AuthRequest, @Param('id') id: string) {
    const tenantId = request.user.tenantId;
    const filas = await this.prisma.priceTier.findMany({
      where: { tenantId, productId: id },
      include: { priceList: { select: { name: true } } },
      orderBy: [{ priceListId: 'asc' }, { minQty: 'asc' }],
    });
    return filas.map(f => ({ id: f.id, priceListId: f.priceListId, priceListName: f.priceList.name, minQty: f.minQty, price: f.price }));
  }

  @Post(':id/tiers')
  @UseGuards(AdminGuard)
  async createTier(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    if (!(await this.prisma.product.findFirst({ where: { id, tenantId } }))) throw new BadRequestException('Producto no encontrado');
    const priceListId = typeof body.priceListId === 'string' && body.priceListId
      ? body.priceListId
      : (await this.prisma.priceList.findFirst({ where: { tenantId, isDefault: true } }))?.id;
    if (!priceListId || !(await this.prisma.priceList.findFirst({ where: { id: priceListId, tenantId } }))) {
      throw new BadRequestException('Lista de precios no encontrada');
    }
    const minQty = Number(body.minQty);
    if (!Number.isFinite(minQty) || minQty <= 1) throw new UnprocessableEntityException('La cantidad mínima tiene que ser mayor a 1');
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) throw new UnprocessableEntityException('El precio debe ser un número mayor o igual a cero');
    try {
      return await this.prisma.priceTier.create({ data: { tenantId, productId: id, priceListId, minQty, price } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya hay una escala para esa cantidad en esa lista');
      throw error;
    }
  }

  @Delete(':id/tiers/:tierId')
  @UseGuards(AdminGuard)
  async deleteTier(@Req() request: AuthRequest, @Param('id') id: string, @Param('tierId') tierId: string) {
    const fila = await this.prisma.priceTier.findFirst({ where: { id: tierId, tenantId: request.user.tenantId, productId: id } });
    if (!fila) throw new BadRequestException('Escala no encontrada');
    await this.prisma.priceTier.delete({ where: { id: tierId } });
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
    // Los precios (costo y venta) se cargan solo desde el módulo de Precios.
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
        isWeighed: body.isWeighed === true,
        purchaseUnit: typeof body.purchaseUnit === 'string' && body.purchaseUnit.trim() ? body.purchaseUnit.trim() : undefined,
        unitsPerPurchase: unitsPerPurchase ?? undefined,
        internalTaxRate: internalTaxRate ?? undefined,
        taxRate, minStock: minStock ?? undefined,
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
    // Los precios (costo y venta) se cargan solo desde el módulo de Precios.
    const minStock = parseOptionalDecimal(body.minStock, 'minStock');
    const taxRate = parseOptionalDecimal(body.taxRate, 'taxRate');
    assertTaxRate(taxRate);
    const internalTaxRate = parseOptionalDecimal(body.internalTaxRate, 'internalTaxRate');
    const unitsPerPurchase = parseOptionalDecimal(body.unitsPerPurchase, 'unitsPerPurchase');
    if (unitsPerPurchase !== undefined && unitsPerPurchase !== null && unitsPerPurchase <= 0) throw new UnprocessableEntityException('Las unidades por bulto deben ser mayores a cero');
    const categoryId = body.categoryId === null || body.categoryId === '' ? null : typeof body.categoryId === 'string' ? body.categoryId : current.categoryId;
    if (categoryId && !(await this.prisma.category.findFirst({ where: { id: categoryId, tenantId } }))) throw new BadRequestException('Categoría no encontrada');

    try {
      return await this.prisma.product.update({ where: { id }, data: {
        barcode, name, unit,
        categoryId,
        brand: typeof body.brand === 'string' ? body.brand.trim() : null,
        description: typeof body.description === 'string' ? body.description.trim() : null,
        manejaVencimiento: typeof body.manejaVencimiento === 'boolean' ? body.manejaVencimiento : current.manejaVencimiento,
        isWeighed: typeof body.isWeighed === 'boolean' ? body.isWeighed : current.isWeighed,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : current.isActive,
        purchaseUnit: body.purchaseUnit === undefined ? current.purchaseUnit : (typeof body.purchaseUnit === 'string' && body.purchaseUnit.trim() ? body.purchaseUnit.trim() : null),
        unitsPerPurchase: unitsPerPurchase === undefined || unitsPerPurchase === null ? current.unitsPerPurchase : unitsPerPurchase,
        internalTaxRate: internalTaxRate === undefined || internalTaxRate === null ? current.internalTaxRate : internalTaxRate,
        minStock: minStock === undefined ? current.minStock : minStock,
        taxRate: taxRate === undefined ? current.taxRate : (taxRate ?? current.taxRate),
      } });
    }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El barcode ya existe'); throw error; }
  }
}
