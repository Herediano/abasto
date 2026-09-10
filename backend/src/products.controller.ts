import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, Req, Res, UnprocessableEntityException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { parsePricesFile } from './price-import.util';
import { autoMap, cell, normalizeHeader, readSheet, type ColumnMapping } from './sheet-import.util';
import { PRODUCT_IMPORT_FIELDS, planProductRows, type PlanRow } from './product-import.util';
import { sendExport } from './export.util';
import { priceChange, type PriceHistoryEntry } from './price-history.util';
import { guardarPrecio, resolverPrecios } from './price-resolver.util';
import { buscarProductoIds } from './product-search.util';
import { effectiveStockRule, suggestedOrder } from './stock-rules.util';

// Alicuotas de IVA vigentes en Argentina. El campo era decimal libre, lo que
// habilitaba cargar valores que despues rompen la facturacion.
export const TAX_RATES = [0, 2.5, 5, 10.5, 21, 27];

// Unidad de venta: lista cerrada. La columna sigue siendo texto libre por
// compatibilidad, pero el alta/edicion solo acepta estos valores (o un alias
// conocido que se normaliza). Los pesables se fuerzan a 'kg'.
export const SALE_UNITS = ['unidad', 'kg', 'g', 'litro', 'ml', 'metro', 'docena'];
const SALE_UNIT_ALIASES: Record<string, string> = {
  u: 'unidad', un: 'unidad', uni: 'unidad', unidades: 'unidad',
  kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kgs: 'kg',
  gr: 'g', grs: 'g', gramo: 'g', gramos: 'g',
  l: 'litro', lt: 'litro', lts: 'litro', litros: 'litro',
  mililitro: 'ml', mililitros: 'ml', cc: 'ml',
  m: 'metro', mt: 'metro', mts: 'metro', metros: 'metro',
  doc: 'docena', docenas: 'docena',
};

function normalizeSaleUnit(value: unknown, fallback: string, isWeighed: boolean): string {
  if (isWeighed) return 'kg';
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!raw) return fallback;
  const canon = SALE_UNIT_ALIASES[raw] ?? raw;
  if (!SALE_UNITS.includes(canon)) throw new UnprocessableEntityException(`La unidad de venta debe ser una de: ${SALE_UNITS.join(', ')}`);
  return canon;
}

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

// Situación frente al IVA -> alícuota efectiva. 'exento' y 'no_gravado' se
// facturan distinto de "0%" pero para el cálculo su tasa es 0.
export const IVA_SITUACIONES = ['21', '10.5', '27', '0', '2.5', '5', 'exento', 'no_gravado'];
const IVA_RATE: Record<string, number> = { '21': 21, '10.5': 10.5, '27': 27, '0': 0, '2.5': 2.5, '5': 5, exento: 0, no_gravado: 0 };

/**
 * Devuelve { ivaSituacion, taxRate } coherentes. Acepta `ivaSituacion` (nuevo) o
 * `taxRate` suelto (import viejo, acciones que solo mandan el número). undefined
 * en ambos = no tocar (para PUT parcial).
 */
function parseIva(body: Record<string, unknown>): { ivaSituacion: string; taxRate: number } | undefined {
  if (body.ivaSituacion !== undefined) {
    const s = String(body.ivaSituacion);
    if (!IVA_SITUACIONES.includes(s)) throw new UnprocessableEntityException(`La situación de IVA debe ser una de: ${IVA_SITUACIONES.join(', ')}`);
    return { ivaSituacion: s, taxRate: IVA_RATE[s] };
  }
  if (body.taxRate !== undefined) {
    const n = Number(body.taxRate);
    assertTaxRate(Number.isFinite(n) ? n : undefined);
    return { ivaSituacion: String(n), taxRate: n };
  }
  return undefined;
}

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionGuard)
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
    // Un producto puede tener codigos adicionales y el codigo del bulto cerrado:
    // el escaneo tiene que encontrarlo por cualquiera de ellos.
    if (query.barcode) filters.push({ OR: [{ barcode: query.barcode }, { packBarcode: query.barcode }, { extraBarcodes: { some: { barcode: query.barcode } } }] });
    // Un pesable se escanea con el código de balanza (peso embebido), que no es
    // el barcode del producto: se resuelve el producto por su SKU.
    if (query.sku) filters.push({ sku: query.sku });
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
  // el conjunto de ids que se pida. Con `warehouseIds` se acota a los depósitos
  // de la sucursal activa (para "bajo mínimo" y la columna Stock del listado).
  private async stockMap(tenantId: string, productIds: string[], warehouseIds?: string[]): Promise<Map<string, number>> {
    if (!productIds.length) return new Map();
    const sums = await this.prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { tenantId, productId: { in: productIds }, ...(warehouseIds?.length ? { warehouseId: { in: warehouseIds } } : {}) },
      _sum: { quantity: true },
    });
    return new Map(sums.map(s => [s.productId, Number(s._sum.quantity ?? 0)]));
  }

  /** Reglas de mín/máx de la sucursal `branchId` para un conjunto de productos. */
  private async branchRuleMap(tenantId: string, branchId: string | null | undefined, productIds: string[]) {
    if (!branchId || !productIds.length) return new Map<string, { minStock: Prisma.Decimal | null; maxStock: Prisma.Decimal | null }>();
    const rows = await this.prisma.productStockRule.findMany({ where: { tenantId, branchId, productId: { in: productIds } }, select: { productId: true, minStock: true, maxStock: true } });
    return new Map(rows.map(r => [r.productId, { minStock: r.minStock, maxStock: r.maxStock }]));
  }

  /**
   * De un conjunto de ids, cuáles ya tuvieron actividad: un asiento de stock,
   * una línea de venta o una línea de factura de compra. Un producto con
   * actividad es historia y no se borra —se desactiva—. Mismo criterio que
   * `clear-reference-catalog`.
   */
  private async productsWithActivity(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const [moves, sales, purchases] = await Promise.all([
      this.prisma.stockMovement.findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ['productId'] }),
      this.prisma.saleLine.findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ['productId'] }),
      this.prisma.purchaseInvoiceLine.findMany({ where: { productId: { in: ids } }, select: { productId: true }, distinct: ['productId'] }),
    ]);
    return new Set([...moves, ...sales, ...purchases].map(x => x.productId));
  }

  /** Borrado real de productos sin actividad. ProductPrice / PriceTier /
   *  ProductBarcode / ProductSupplier / historial caen por cascada; los lotes
   *  no tienen cascada, así que se borran a mano en la misma transacción (sin
   *  actividad no tienen movimientos que los aten). */
  private async hardDeleteProducts(tenantId: string, ids: string[]) {
    if (!ids.length) return;
    await this.prisma.$transaction([
      this.prisma.productLot.deleteMany({ where: { tenantId, productId: { in: ids } } }),
      this.prisma.product.deleteMany({ where: { tenantId, id: { in: ids } } }),
    ]);
  }

  /**
   * "Se compra por bulto cerrado": lee purchaseUnit / unitsPerPurchase /
   * packBarcode del body y los devuelve coherentes. Sin purchaseUnit = se
   * compra en la misma unidad que se vende (factor 1, sin código de bulto).
   */
  private parsePurchasePack(body: Record<string, unknown>): { purchaseUnit: string | null; unitsPerPurchase: number; packBarcode: string | null } {
    const purchaseUnit = typeof body.purchaseUnit === 'string' && body.purchaseUnit.trim() ? body.purchaseUnit.trim() : null;
    const packBarcode = typeof body.packBarcode === 'string' && body.packBarcode.trim() ? body.packBarcode.trim() : null;
    if (!purchaseUnit) {
      if (packBarcode) throw new UnprocessableEntityException('El código del bulto necesita que primero definas el bulto de compra');
      return { purchaseUnit: null, unitsPerPurchase: 1, packBarcode: null };
    }
    const n = Number(body.unitsPerPurchase);
    if (!Number.isFinite(n) || n <= 1) throw new UnprocessableEntityException('Un bulto tiene que traer más de una unidad de venta');
    return { purchaseUnit, unitsPerPurchase: n, packBarcode };
  }

  /** El código no puede chocar con otro producto: ni con su barcode principal,
   *  ni con el de otro bulto, ni con un código adicional. */
  private async assertBarcodeFree(tenantId: string, code: string, exceptProductId?: string) {
    const notThis = exceptProductId ? { id: { not: exceptProductId } } : {};
    const [asMain, asPack, asExtra] = await Promise.all([
      this.prisma.product.findFirst({ where: { tenantId, barcode: code, ...notThis }, select: { id: true } }),
      this.prisma.product.findFirst({ where: { tenantId, packBarcode: code, ...notThis }, select: { id: true } }),
      this.prisma.productBarcode.findFirst({ where: { tenantId, barcode: code }, select: { id: true } }),
    ]);
    if (asMain || asPack || asExtra) throw new ConflictException(`El código ${code} ya lo usa otro producto`);
  }

  @Get() @RequirePermission('productos.ver')
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
    // La columna Stock y "bajo mínimo" son de la sucursal activa.
    const branchId = request.user.branchId ?? null;
    const whIds = request.user.branchWarehouseIds;

    // Con priceListId se muestra el precio de esa lista (resuelto, incluida la
    // derivacion) en vez del de la lista base que cachea Product.salePrice.
    const listaPedida = query.priceListId
      ? await this.prisma.priceList.findFirst({ where: { id: query.priceListId, tenantId }, select: { id: true, isDefault: true } })
      : null;
    if (query.priceListId && !listaPedida) throw new BadRequestException('Lista de precios no encontrada');

    const shape = async (
      items: Array<{ id: string; category?: { name: string } | null; minStock?: Prisma.Decimal | null; maxStock?: Prisma.Decimal | null }>,
      stock: Map<string, number>,
      total: number,
    ) => {
      const deLista = listaPedida && !listaPedida.isDefault
        ? await resolverPrecios(this.prisma, tenantId, items.map(i => i.id), listaPedida.id)
        : null;
      const rules = await this.branchRuleMap(tenantId, branchId, items.map(i => i.id));
      return {
        items: items.map(p => {
          const eff = effectiveStockRule({ minStock: p.minStock, maxStock: p.maxStock }, rules.get(p.id));
          return {
            ...p,
            categoryName: p.category?.name ?? null,
            category: undefined,
            currentStock: stock.get(p.id) ?? 0,
            // minStock/maxStock ya resueltos para la sucursal activa.
            minStock: eff.minStock == null ? null : String(eff.minStock),
            maxStock: eff.maxStock == null ? null : String(eff.maxStock),
            ...(deLista ? { salePrice: deLista.get(p.id) ?? null } : {}),
          };
        }),
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    };

    // "Stock bajo" / "Sin stock" dependen de un SUM que no vive en la tabla, asi
    // que se resuelve el universo completo, se filtra en memoria y recien ahi se pagina.
    if (stockFilter) {
      const candidates = await this.prisma.product.findMany({ where, select: { id: true, minStock: true, maxStock: true } });
      const stockAll = await this.stockMap(tenantId, candidates.map(c => c.id), whIds);
      const rules = await this.branchRuleMap(tenantId, branchId, candidates.map(c => c.id));
      const matchIds = candidates
        .filter(c => {
          const s = stockAll.get(c.id) ?? 0;
          if (stockFilter === 'out') return s <= 0;
          const min = effectiveStockRule(c, rules.get(c.id)).minStock;
          return min != null && s < min;
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
      return await shape(items, await this.stockMap(tenantId, pagina, whIds), ordenados.length);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: { category: { select: { name: true } } }, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.product.count({ where }),
    ]);
    return await shape(items, await this.stockMap(tenantId, items.map(i => i.id), whIds), total);
  }

  @Get('brands') @RequirePermission('productos.ver')
  async brands(@Req() request: AuthRequest) {
    const rows = await this.prisma.product.findMany({
      where: { tenantId: request.user.tenantId, brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return rows.map(r => r.brand).filter((b): b is string => !!b);
  }

  @Get('low-stock') @RequirePermission('productos.ver')
  async lowStock(@Req() request: AuthRequest) {
    const tenantId = request.user.tenantId;
    const branchId = request.user.branchId ?? null;
    // Candidatos: los que tienen mínimo general, más los que tienen una regla
    // propia con mínimo en la sucursal activa.
    const products = await this.prisma.product.findMany({
      where: {
        tenantId, isActive: true,
        OR: [
          { minStock: { not: null } },
          ...(branchId ? [{ stockRules: { some: { branchId, minStock: { not: null } } } }] : []),
        ],
      },
      include: { suppliers: { where: { isPreferred: true }, include: { supplier: { select: { name: true } } }, take: 1 } },
    });
    if (!products.length) return [];
    const ids = products.map(p => p.id);
    const [sumMap, ruleMap] = await Promise.all([
      this.stockMap(tenantId, ids, request.user.branchWarehouseIds),
      this.branchRuleMap(tenantId, branchId, ids),
    ]);
    return products
      .map(p => {
        const eff = effectiveStockRule(p, ruleMap.get(p.id));
        const currentStock = sumMap.get(p.id) ?? 0;
        const packSize = p.purchaseUnit ? Number(p.unitsPerPurchase) : 1;
        const pref = p.suppliers[0];
        const { suppliers, ...rest } = p;
        void suppliers;
        return {
          ...rest,
          currentStock,
          minStock: eff.minStock == null ? null : String(eff.minStock),
          maxStock: eff.maxStock == null ? null : String(eff.maxStock),
          branchOverride: eff.branchOverride,
          suggestedOrder: suggestedOrder(currentStock, eff.maxStock, packSize),
          preferredSupplierName: pref?.supplier.name ?? null,
          preferredSupplierCode: pref?.supplierCode ?? null,
          _min: eff.minStock,
        };
      })
      .filter(p => p._min != null && p.currentStock < p._min)
      .sort((a, b) => a.currentStock / (a._min || 1) - b.currentStock / (b._min || 1))
      .map(({ _min, ...p }) => { void _min; return p; });
  }

  @Post('import-reference')
  @RequirePermission('productos.editar')
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
          sku: String(startCode + i),
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
  @RequirePermission('productos.editar')
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
  @RequirePermission('productos.ver')
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

    // CSV: mismo contenido, sin el estilo del Excel (ver export.util / diseno.md).
    if (query.format === 'csv') {
      await sendExport(
        res,
        'csv',
        'productos',
        [
          { header: 'SKU', key: 'sku' },
          { header: 'Código de barras', key: 'barcode' },
          { header: 'Producto', key: 'name' },
          { header: 'Marca', key: 'brand' },
          { header: 'Categoría', key: 'category' },
          { header: 'Unidad de venta', key: 'unit' },
          { header: 'Precio de costo', key: 'costPrice' },
          { header: 'Precio de venta', key: 'salePrice' },
          { header: 'IVA %', key: 'taxRate' },
          { header: 'Stock actual', key: 'currentStock' },
          { header: 'Stock mínimo', key: 'minStock' },
          { header: 'Estado', key: 'status' },
        ],
        products.map(p => ({
          sku: p.sku ?? '',
          barcode: p.barcode,
          name: p.name,
          brand: p.brand ?? '',
          category: p.category?.name ?? '',
          unit: p.unit,
          costPrice: p.costPrice ? Number(p.costPrice) : '',
          salePrice: p.salePrice ? Number(p.salePrice) : '',
          taxRate: Number(p.taxRate),
          currentStock: stock.get(p.id) ?? 0,
          minStock: p.minStock != null ? Number(p.minStock) : '',
          status: p.isActive ? 'Activo' : 'Inactivo',
        })),
      );
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mayorista ERP';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Productos', { views: [{ state: 'frozen', ySplit: 1 }] });

    // "Código de barras", "Producto", "Precio de costo" y "Precio de venta"
    // conservan su encabezado exacto para que la planilla siga sirviendo como
    // base del reimporte de precios (products/import-prices).
    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Código de barras', key: 'barcode', width: 18 },
      { header: 'Códigos adicionales', key: 'extraBarcodes', width: 24 },
      { header: 'Producto', key: 'name', width: 42 },
      { header: 'Marca', key: 'brand', width: 18 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Unidad de venta', key: 'unit', width: 14 },
      { header: 'Pesable', key: 'isWeighed', width: 10 },
      { header: 'Unidad de compra', key: 'purchaseUnit', width: 16 },
      { header: 'Unidades por bulto', key: 'unitsPerPurchase', width: 16 },
      { header: 'Código del bulto', key: 'packBarcode', width: 18 },
      { header: 'Precio de costo', key: 'costPrice', width: 16 },
      { header: 'Precio de venta', key: 'salePrice', width: 16 },
      { header: 'Margen %', key: 'margin', width: 12 },
      { header: 'IVA %', key: 'taxRate', width: 10 },
      { header: 'Imp. internos %', key: 'internalTaxRate', width: 14 },
      { header: 'Stock actual', key: 'currentStock', width: 13 },
      { header: 'Stock mínimo', key: 'minStock', width: 13 },
      { header: 'Reponer hasta', key: 'maxStock', width: 13 },
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
        sku: p.sku ?? '',
        barcode: p.barcode,
        extraBarcodes: p.extraBarcodes.map(b => b.barcode).join(' / '),
        name: p.name,
        brand: p.brand ?? '',
        category: p.category?.name ?? '',
        unit: p.unit,
        isWeighed: p.isWeighed ? 'Sí' : 'No',
        purchaseUnit: p.purchaseUnit ?? '',
        unitsPerPurchase: Number(p.unitsPerPurchase),
        packBarcode: p.packBarcode ?? '',
        costPrice: cost,
        salePrice: sale,
        margin: cost != null && sale != null && sale > 0 ? (sale - cost) / sale : null,
        taxRate: Number(p.taxRate),
        internalTaxRate: Number(p.internalTaxRate),
        currentStock: stock.get(p.id) ?? 0,
        minStock: p.minStock != null ? Number(p.minStock) : null,
        maxStock: p.maxStock != null ? Number(p.maxStock) : null,
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

  /** Catálogo de columnas que entiende el importador de productos (para el wizard). */
  @Get('import-fields') @RequirePermission('productos.crear')
  importFields() {
    return { fields: PRODUCT_IMPORT_FIELDS };
  }

  /**
   * Importa productos desde Excel/CSV, en 3 fases (se re-sube el archivo en cada
   * una; son chicos):
   *  - `phase=inspect` (sin mapping): devuelve encabezados, mapeo sugerido y filas de muestra.
   *  - `phase=preview` + `mapping`: devuelve el plan (crear/actualizar/errores) sin tocar nada.
   *  - `phase=apply` + `mapping`: lo aplica.
   * `mapping` es un JSON { campo: índiceDeColumna }.
   */
  @Post('import')
  @RequirePermission('productos.crear')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  async importProducts(@Req() request: AuthRequest, @UploadedFile() file: Express.Multer.File, @Body() body: { mapping?: string; phase?: string }) {
    if (!file) throw new BadRequestException('Subí un archivo .csv o .xlsx');
    const tenantId = request.user.tenantId;
    const userId = request.user.id;
    const phase = body.phase === 'apply' ? 'apply' : body.phase === 'preview' ? 'preview' : 'inspect';

    const sheet = await readSheet(file.buffer, file.originalname);
    if (!sheet.headers.length) throw new UnprocessableEntityException('El archivo está vacío o no se pudo leer');
    if (sheet.rows.length > 10000) throw new UnprocessableEntityException('El archivo tiene demasiadas filas (máximo 10.000 por vez)');

    if (phase === 'inspect') {
      return {
        headers: sheet.headers,
        rowCount: sheet.rows.filter(r => r.some(c => c.trim())).length,
        suggested: autoMap(sheet.headers, PRODUCT_IMPORT_FIELDS),
        sampleRows: sheet.rows.filter(r => r.some(c => c.trim())).slice(0, 5),
      };
    }

    let mapping: ColumnMapping = {};
    try { mapping = { ...(JSON.parse(body.mapping || '{}') as ColumnMapping) }; }
    catch { throw new BadRequestException('El mapeo de columnas no es válido'); }
    if (mapping.barcode == null || mapping.barcode < 0) throw new UnprocessableEntityException('Falta indicar qué columna tiene el código de barras');
    const mapped = (k: string) => mapping[k] != null && mapping[k] >= 0;
    if (mapped('purchaseUnit') && !mapped('unitsPerPurchase')) {
      throw new UnprocessableEntityException('Mapeaste «Unidad de compra (bulto)» pero falta «Unidades por bulto»: sin eso no se sabe cuántas unidades trae el bulto.');
    }

    const barcodesInFile = [...new Set(sheet.rows.map(r => cell(r, mapping, 'barcode')).filter(Boolean))];
    const [existing, cats, todos, extra] = await Promise.all([
      this.prisma.product.findMany({ where: { tenantId, barcode: { in: barcodesInFile } }, select: { id: true, barcode: true } }),
      this.prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      this.prisma.product.findMany({ where: { tenantId }, select: { barcode: true, packBarcode: true } }),
      this.prisma.productBarcode.findMany({ where: { tenantId }, select: { barcode: true } }),
    ]);
    const existingByBarcode = new Map(existing.map(p => [p.barcode, { id: p.id }]));
    const categoriesByName = new Map(cats.map(c => [normalizeHeader(c.name), c.id]));
    const takenBarcodes = new Set<string>();
    for (const p of todos) { if (!existingByBarcode.has(p.barcode)) takenBarcodes.add(p.barcode); if (p.packBarcode) takenBarcodes.add(p.packBarcode); }
    for (const b of extra) takenBarcodes.add(b.barcode);

    const plan = planProductRows({ sheet, mapping, existingByBarcode, categoriesByName, takenBarcodes });
    const creates = plan.filter((p): p is Extract<PlanRow, { kind: 'create' }> => p.kind === 'create');
    const updates = plan.filter((p): p is Extract<PlanRow, { kind: 'update' }> => p.kind === 'update');
    const errors = plan.filter((p): p is Extract<PlanRow, { kind: 'error' }> => p.kind === 'error');

    if (phase === 'preview') {
      return {
        willCreate: creates.length,
        willUpdate: updates.length,
        skipped: plan.filter(p => p.kind === 'skip').length,
        errors: errors.map(e => ({ row: e.rowNumber, message: e.message })),
        sample: [...creates, ...updates].slice(0, 15).map(p => ({
          barcode: p.barcode,
          action: p.kind === 'create' ? 'Crear' : 'Actualizar',
          campos: [...Object.keys(p.fields).filter(k => k !== 'taxRate'), ...(p.cost != null ? ['costo'] : []), ...(p.sale != null ? ['venta'] : [])],
        })),
      };
    }

    const base = await this.prisma.priceList.findFirst({ where: { tenantId, isDefault: true }, select: { id: true } });
    if ([...creates, ...updates].some(p => p.sale != null) && !base) {
      throw new UnprocessableEntityException('No hay una lista de precios base para cargar precios de venta');
    }

    let created = 0;
    let updated = 0;
    await this.prisma.$transaction(async tx => {
      if (creates.length) {
        const [{ product_code_seq: seqEnd }] = await tx.$queryRaw<Array<{ product_code_seq: number }>>`
          UPDATE tenants SET product_code_seq = product_code_seq + ${creates.length} WHERE id = ${tenantId}::uuid RETURNING product_code_seq
        `;
        const seqStart = seqEnd - creates.length + 1;
        await tx.product.createMany({
          data: creates.map((c, i) => ({
            tenantId, sku: String(seqStart + i), barcode: c.barcode,
            name: c.fields.name!, unit: c.fields.unit ?? 'unidad',
            brand: c.fields.brand ?? undefined,
            categoryId: c.fields.categoryId ?? undefined,
            isWeighed: c.fields.isWeighed ?? undefined,
            ivaSituacion: c.fields.ivaSituacion ?? undefined,
            taxRate: c.fields.taxRate ?? undefined,
            internalTaxRate: c.fields.internalTaxRate ?? undefined,
            purchaseUnit: c.fields.purchaseUnit ?? undefined,
            unitsPerPurchase: c.fields.unitsPerPurchase ?? undefined,
            packBarcode: c.fields.packBarcode ?? undefined,
            minStock: c.fields.minStock ?? undefined,
            maxStock: c.fields.maxStock ?? undefined,
            manejaVencimiento: c.fields.manejaVencimiento ?? undefined,
          })),
        });
        created = creates.length;
      }

      for (const u of updates) {
        const data: Prisma.ProductUncheckedUpdateInput = {};
        const f = u.fields;
        if (f.name !== undefined) data.name = f.name;
        if (f.brand !== undefined) data.brand = f.brand;
        if (f.categoryId !== undefined) data.categoryId = f.categoryId;
        if (f.unit !== undefined) data.unit = f.unit;
        if (f.isWeighed !== undefined) data.isWeighed = f.isWeighed;
        if (f.ivaSituacion !== undefined) { data.ivaSituacion = f.ivaSituacion; data.taxRate = f.taxRate; }
        if (f.internalTaxRate !== undefined) data.internalTaxRate = f.internalTaxRate;
        if (f.purchaseUnit !== undefined) data.purchaseUnit = f.purchaseUnit;
        if (f.unitsPerPurchase !== undefined) data.unitsPerPurchase = f.unitsPerPurchase;
        if (f.packBarcode !== undefined) data.packBarcode = f.packBarcode;
        if (f.minStock !== undefined) data.minStock = f.minStock;
        if (f.maxStock !== undefined) data.maxStock = f.maxStock;
        if (f.manejaVencimiento !== undefined) data.manejaVencimiento = f.manejaVencimiento;
        if (Object.keys(data).length) await tx.product.update({ where: { id: u.productId }, data });
        updated++;
      }

      const conPrecio = [...creates, ...updates].filter(p => p.cost != null || p.sale != null);
      if (conPrecio.length) {
        const prods = new Map((await tx.product.findMany({
          where: { tenantId, barcode: { in: conPrecio.map(p => p.barcode) } },
          select: { id: true, barcode: true, costPrice: true, salePrice: true },
        })).map(p => [p.barcode, p]));
        const historia: PriceHistoryEntry[] = [];
        for (const p of conPrecio) {
          const prod = prods.get(p.barcode);
          if (!prod) continue;
          if (p.cost != null) {
            const h = priceChange({ tenantId, productId: prod.id, field: 'cost', before: prod.costPrice, after: p.cost, source: 'import', userId });
            if (h) { historia.push(h); await tx.product.update({ where: { id: prod.id }, data: { costPrice: p.cost } }); }
          }
          if (p.sale != null && base) {
            const h = priceChange({ tenantId, productId: prod.id, field: 'sale', before: prod.salePrice, after: p.sale, source: 'import', userId });
            if (h) { historia.push(h); await guardarPrecio(tx, { tenantId, productId: prod.id, priceListId: base.id, price: p.sale, source: 'import', userId }); }
          }
        }
        if (historia.length) await tx.productPriceHistory.createMany({ data: historia });
      }
    }, { timeout: 120_000, maxWait: 10_000 });

    return {
      created,
      updated,
      skipped: plan.filter(p => p.kind === 'skip').length,
      errors: errors.map(e => ({ row: e.rowNumber, message: e.message })),
    };
  }

  @Post('import-prices')
  @RequirePermission('precios.editar')
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

  @Get(':id') @RequirePermission('productos.ver')
  async get(@Req() request: AuthRequest, @Param('id') id: string) {
    const product = await this.prisma.product.findFirstOrThrow({
      where: { id, tenantId: request.user.tenantId },
      include: {
        category: { select: { name: true } },
        extraBarcodes: { orderBy: { createdAt: 'asc' } },
        suppliers: { include: { supplier: { select: { name: true } } }, orderBy: [{ isPreferred: 'desc' }, { lastPurchaseAt: 'desc' }, { supplier: { name: 'asc' } }] },
        priceHistory: { orderBy: { createdAt: 'desc' }, take: 50 },
        stockRules: { include: { branch: { select: { id: true, name: true } } } },
      },
    });
    return {
      ...product,
      categoryName: product.category?.name ?? null,
      category: undefined,
      suppliers: product.suppliers.map(s => ({ id: s.id, supplierId: s.supplierId, supplierName: s.supplier.name, supplierCode: s.supplierCode, lastCost: s.lastCost, lastPurchaseAt: s.lastPurchaseAt, isPreferred: s.isPreferred })),
      stockRules: product.stockRules.map(r => ({ branchId: r.branchId, branchName: r.branch.name, minStock: r.minStock, maxStock: r.maxStock })),
      activeBranchId: request.user.branchId ?? null,
    };
  }

  /**
   * Fija (o borra) el mín/máx de reposición de un producto EN UNA SUCURSAL.
   * Sin branchId toma la sucursal activa. min y max en null borran la regla:
   * la sucursal vuelve a usar el valor general del producto.
   */
  @Put(':id/stock-rule')
  @RequirePermission('productos.editar')
  async setStockRule(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: { branchId?: unknown; minStock?: unknown; maxStock?: unknown }) {
    const tenantId = request.user.tenantId;
    const branchId = typeof body.branchId === 'string' && body.branchId ? body.branchId : request.user.branchId;
    if (!branchId) throw new BadRequestException('No hay una sucursal activa para la regla de reposición');
    if (!(await this.prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } }))) throw new BadRequestException('Producto no encontrado');
    if (!(await this.prisma.branch.findFirst({ where: { id: branchId, tenantId }, select: { id: true } }))) throw new BadRequestException('Sucursal no encontrada');
    const minStock = parseOptionalDecimal(body.minStock, 'minStock') ?? null;
    const maxStock = parseOptionalDecimal(body.maxStock, 'maxStock') ?? null;
    if (minStock != null && maxStock != null && maxStock < minStock) throw new UnprocessableEntityException('"Reponer hasta" no puede ser menor que el mínimo');
    if (minStock == null && maxStock == null) {
      await this.prisma.productStockRule.deleteMany({ where: { tenantId, productId: id, branchId } });
      return { cleared: true };
    }
    return this.prisma.productStockRule.upsert({
      where: { productId_branchId: { productId: id, branchId } },
      create: { tenantId, productId: id, branchId, minStock, maxStock },
      update: { minStock, maxStock },
      select: { branchId: true, minStock: true, maxStock: true },
    });
  }

  /**
   * Precio de costo y de venta de UN producto, desde su pantalla. El costo es
   * un campo del producto; la venta va a ProductPrice de la lista base (misma
   * ruta que usa la actualización masiva). Los cambios quedan en el historial.
   */
  @Put(':id/price')
  @RequirePermission('precios.editar')
  async setPrice(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: { costPrice?: unknown; salePrice?: unknown }) {
    const tenantId = request.user.tenantId;
    const userId = request.user.id;
    const product = await this.prisma.product.findFirst({ where: { id, tenantId }, select: { id: true, costPrice: true, salePrice: true } });
    if (!product) throw new BadRequestException('Producto no encontrado');
    const tocaCosto = body.costPrice !== undefined;
    const tocaVenta = body.salePrice !== undefined;
    if (!tocaCosto && !tocaVenta) return { costPrice: product.costPrice, salePrice: product.salePrice };
    const nuevoCosto = tocaCosto ? parseOptionalDecimal(body.costPrice, 'costPrice') : undefined;
    const nuevaVenta = tocaVenta ? parseOptionalDecimal(body.salePrice, 'salePrice') : undefined;
    if (tocaVenta && (nuevaVenta === null || nuevaVenta === undefined || nuevaVenta <= 0)) {
      throw new UnprocessableEntityException('El precio de venta tiene que ser un número mayor a cero');
    }
    const base = tocaVenta ? await this.prisma.priceList.findFirst({ where: { tenantId, isDefault: true }, select: { id: true } }) : null;
    if (tocaVenta && !base) throw new UnprocessableEntityException('No hay una lista de precios base configurada');

    await this.prisma.$transaction(async tx => {
      const historia: PriceHistoryEntry[] = [];
      if (tocaCosto) {
        if (nuevoCosto === null) {
          if (product.costPrice != null) await tx.product.update({ where: { id }, data: { costPrice: null } });
        } else {
          const h = priceChange({ tenantId, productId: id, field: 'cost', before: product.costPrice, after: nuevoCosto, source: 'manual', userId });
          if (h) {
            historia.push(h);
            await tx.product.update({ where: { id }, data: { costPrice: nuevoCosto } });
          }
        }
      }
      if (tocaVenta && nuevaVenta != null) {
        const h = priceChange({ tenantId, productId: id, field: 'sale', before: product.salePrice, after: nuevaVenta, source: 'manual', userId });
        if (h) {
          historia.push(h);
          await guardarPrecio(tx, { tenantId, productId: id, priceListId: base!.id, price: nuevaVenta, source: 'manual', userId });
        }
      }
      if (historia.length) await tx.productPriceHistory.createMany({ data: historia });
    });
    return this.prisma.product.findFirst({ where: { id }, select: { id: true, costPrice: true, salePrice: true } });
  }

  @Post(':id/barcodes')
  @RequirePermission('productos.editar')
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
  @RequirePermission('productos.editar')
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
  @Get(':id/tiers') @RequirePermission('precios.ver')
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
  @RequirePermission('precios.editar')
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
  @RequirePermission('precios.editar')
  async deleteTier(@Req() request: AuthRequest, @Param('id') id: string, @Param('tierId') tierId: string) {
    const fila = await this.prisma.priceTier.findFirst({ where: { id: tierId, tenantId: request.user.tenantId, productId: id } });
    if (!fila) throw new BadRequestException('Escala no encontrada');
    await this.prisma.priceTier.delete({ where: { id: tierId } });
    return { deleted: true };
  }

  // --- Proveedores del producto -------------------------------------------
  // El vínculo se llena solo al confirmar compras, pero también se carga a mano
  // (negocios que migran con años de compras sin recargar). El proveedor
  // marcado como preferido es a quien se le pide al reponer; hay uno solo.

  private async ensurePreferredSupplier(tx: Prisma.TransactionClient, tenantId: string, productId: string) {
    const hay = await tx.productSupplier.findFirst({ where: { tenantId, productId, isPreferred: true }, select: { id: true } });
    if (hay) return;
    const primero = await tx.productSupplier.findFirst({ where: { tenantId, productId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (primero) await tx.productSupplier.update({ where: { id: primero.id }, data: { isPreferred: true } });
  }

  @Post(':id/suppliers')
  @RequirePermission('productos.editar')
  async addSupplier(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: { supplierId?: unknown; supplierCode?: unknown; cost?: unknown; preferred?: unknown }) {
    const tenantId = request.user.tenantId;
    if (!(await this.prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } }))) throw new BadRequestException('Producto no encontrado');
    const supplierId = typeof body.supplierId === 'string' ? body.supplierId : '';
    if (!supplierId || !(await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId, isActive: true }, select: { id: true } }))) throw new BadRequestException('Proveedor no encontrado');
    if (await this.prisma.productSupplier.findFirst({ where: { tenantId, productId: id, supplierId }, select: { id: true } })) throw new ConflictException('Ese proveedor ya está asociado al producto');
    const supplierCode = typeof body.supplierCode === 'string' && body.supplierCode.trim() ? body.supplierCode.trim() : null;
    const lastCost = parseOptionalDecimal(body.cost, 'cost') ?? null;
    const preferred = body.preferred === true;
    return this.prisma.$transaction(async tx => {
      if (preferred) await tx.productSupplier.updateMany({ where: { tenantId, productId: id }, data: { isPreferred: false } });
      const row = await tx.productSupplier.create({ data: { tenantId, productId: id, supplierId, supplierCode, lastCost, isPreferred: preferred } });
      await this.ensurePreferredSupplier(tx, tenantId, id);
      return row;
    });
  }

  @Patch(':id/suppliers/:supplierId')
  @RequirePermission('productos.editar')
  async updateSupplier(@Req() request: AuthRequest, @Param('id') id: string, @Param('supplierId') supplierId: string, @Body() body: { supplierCode?: unknown; cost?: unknown; preferred?: unknown }) {
    const tenantId = request.user.tenantId;
    const link = await this.prisma.productSupplier.findFirst({ where: { tenantId, productId: id, supplierId } });
    if (!link) throw new BadRequestException('El proveedor no está asociado al producto');
    const data: Prisma.ProductSupplierUncheckedUpdateInput = {};
    if ('supplierCode' in body) data.supplierCode = typeof body.supplierCode === 'string' && body.supplierCode.trim() ? body.supplierCode.trim() : null;
    if ('cost' in body) data.lastCost = parseOptionalDecimal(body.cost, 'cost') ?? null;
    return this.prisma.$transaction(async tx => {
      if (body.preferred === true) await tx.productSupplier.updateMany({ where: { tenantId, productId: id, NOT: { supplierId } }, data: { isPreferred: false } });
      if ('preferred' in body) data.isPreferred = body.preferred === true;
      const row = await tx.productSupplier.update({ where: { id: link.id }, data });
      await this.ensurePreferredSupplier(tx, tenantId, id);
      return row;
    });
  }

  @Delete(':id/suppliers/:supplierId')
  @RequirePermission('productos.editar')
  async removeSupplier(@Req() request: AuthRequest, @Param('id') id: string, @Param('supplierId') supplierId: string) {
    const tenantId = request.user.tenantId;
    const link = await this.prisma.productSupplier.findFirst({ where: { tenantId, productId: id, supplierId } });
    if (!link) throw new BadRequestException('El proveedor no está asociado al producto');
    const hadPurchases = link.lastPurchaseAt != null;
    await this.prisma.$transaction(async tx => {
      await tx.productSupplier.delete({ where: { id: link.id } });
      if (link.isPreferred) await this.ensurePreferredSupplier(tx, tenantId, id);
    });
    return { deleted: true, hadPurchases };
  }

  @Get(':id/lots') @RequirePermission('stock.ver')
  lots(@Req() request: AuthRequest, @Param('id') id: string) {
    const tenantId = request.user.tenantId;
    return this.prisma.productLot.findMany({ where: { tenantId, productId: id }, orderBy: [{ expirationDate: 'asc' }, { lotNumber: 'asc' }] });
  }

  @Put(':id/lots/:lotId')
  @RequirePermission('stock.mover')
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
  @RequirePermission('stock.mover')
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
  @RequirePermission('productos.crear')
  async create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    for (const field of ['barcode', 'name', 'unit']) if (typeof body[field] !== 'string' || !(body[field] as string).trim()) throw new BadRequestException(`${field} es obligatorio`);
    // Los precios (costo y venta) se cargan solo desde el módulo de Precios.
    const minStock = parseOptionalDecimal(body.minStock, 'minStock');
    const maxStock = parseOptionalDecimal(body.maxStock, 'maxStock');
    const iva = parseIva(body);
    const internalTaxRate = parseOptionalDecimal(body.internalTaxRate, 'internalTaxRate');
    const isWeighed = body.isWeighed === true;
    const unit = normalizeSaleUnit(body.unit, 'unidad', isWeighed);
    const pack = this.parsePurchasePack(body);
    const barcode = (body.barcode as string).trim();
    const categoryId = typeof body.categoryId === 'string' && body.categoryId ? body.categoryId : undefined;
    if (categoryId && !(await this.prisma.category.findFirst({ where: { id: categoryId, tenantId } }))) throw new BadRequestException('Categoría no encontrada');
    await this.assertBarcodeFree(tenantId, barcode);
    if (pack.packBarcode) await this.assertBarcodeFree(tenantId, pack.packBarcode);

    const [{ product_code_seq: sku }] = await this.prisma.$queryRaw<Array<{ product_code_seq: number }>>`
      UPDATE tenants SET product_code_seq = product_code_seq + 1 WHERE id = ${tenantId}::uuid RETURNING product_code_seq
    `;

    try {
      return await this.prisma.product.create({ data: {
        tenantId, sku: String(sku), barcode, name: (body.name as string).trim(), unit,
        categoryId,
        brand: typeof body.brand === 'string' ? body.brand : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        manejaVencimiento: body.manejaVencimiento === true,
        isWeighed,
        purchaseUnit: pack.purchaseUnit ?? undefined,
        unitsPerPurchase: pack.unitsPerPurchase,
        packBarcode: pack.packBarcode ?? undefined,
        internalTaxRate: internalTaxRate ?? undefined,
        ivaSituacion: iva?.ivaSituacion ?? undefined,
        taxRate: iva?.taxRate ?? undefined,
        minStock: minStock ?? undefined,
        maxStock: maxStock ?? undefined,
      } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe un producto con ese código de barras');
      throw error;
    }
  }

  @Put(':id')
  @RequirePermission('productos.editar')
  async update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const current = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!current) throw new BadRequestException('Producto no encontrado');
    const barcode = typeof body.barcode === 'string' ? body.barcode.trim() : current.barcode;
    const name = typeof body.name === 'string' ? body.name.trim() : current.name;
    if (!barcode || !name) throw new BadRequestException('barcode y name son obligatorios');
    // Los precios (costo y venta) se cargan solo desde el módulo de Precios.
    const minStock = parseOptionalDecimal(body.minStock, 'minStock');
    const maxStock = parseOptionalDecimal(body.maxStock, 'maxStock');
    const iva = parseIva(body);
    const internalTaxRate = parseOptionalDecimal(body.internalTaxRate, 'internalTaxRate');
    const isWeighed = typeof body.isWeighed === 'boolean' ? body.isWeighed : current.isWeighed;
    const unit = body.unit === undefined && !isWeighed ? current.unit : normalizeSaleUnit(body.unit, current.unit, isWeighed);
    const categoryId = body.categoryId === null || body.categoryId === '' ? null : typeof body.categoryId === 'string' ? body.categoryId : current.categoryId;
    if (categoryId && !(await this.prisma.category.findFirst({ where: { id: categoryId, tenantId } }))) throw new BadRequestException('Categoría no encontrada');

    // El bulto de compra solo se toca si el body trae alguno de sus campos
    // (así el PUT parcial de activar/desactivar no lo borra).
    const tocaPack = body.purchaseUnit !== undefined || body.unitsPerPurchase !== undefined || body.packBarcode !== undefined;
    const pack = tocaPack
      ? this.parsePurchasePack(body)
      : { purchaseUnit: current.purchaseUnit, unitsPerPurchase: Number(current.unitsPerPurchase), packBarcode: current.packBarcode };
    if (barcode !== current.barcode) await this.assertBarcodeFree(tenantId, barcode, id);
    if (pack.packBarcode && pack.packBarcode !== current.packBarcode) await this.assertBarcodeFree(tenantId, pack.packBarcode, id);

    try {
      return await this.prisma.product.update({ where: { id }, data: {
        barcode, name, unit,
        categoryId,
        brand: body.brand === undefined ? current.brand : (typeof body.brand === 'string' && body.brand.trim() ? body.brand.trim() : null),
        description: body.description === undefined ? current.description : (typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null),
        manejaVencimiento: typeof body.manejaVencimiento === 'boolean' ? body.manejaVencimiento : current.manejaVencimiento,
        isWeighed,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : current.isActive,
        purchaseUnit: pack.purchaseUnit,
        unitsPerPurchase: pack.unitsPerPurchase,
        packBarcode: pack.packBarcode,
        internalTaxRate: internalTaxRate === undefined || internalTaxRate === null ? current.internalTaxRate : internalTaxRate,
        minStock: minStock === undefined ? current.minStock : minStock,
        maxStock: maxStock === undefined ? current.maxStock : maxStock,
        ivaSituacion: iva?.ivaSituacion ?? current.ivaSituacion,
        taxRate: iva?.taxRate ?? current.taxRate,
      } });
    }
    catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('El barcode ya existe'); throw error; }
  }

  /**
   * Borra un producto. Si nunca se movió (sin stock, sin ventas, sin compras)
   * se borra de verdad; si ya tiene historia, se rechaza —desde ahí el frontend
   * ofrece desactivarlo, que es lo correcto para un producto que existió—.
   */
  @Delete(':id')
  @RequirePermission('productos.eliminar')
  async remove(@Req() request: AuthRequest, @Param('id') id: string) {
    const tenantId = request.user.tenantId;
    if (!(await this.prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } }))) {
      throw new BadRequestException('Producto no encontrado');
    }
    if ((await this.productsWithActivity([id])).has(id)) {
      throw new ConflictException({
        code: 'PRODUCT_HAS_ACTIVITY',
        message: 'Este producto ya tuvo movimientos (stock, ventas o compras). No se puede borrar; se puede desactivar.',
      });
    }
    await this.hardDeleteProducts(tenantId, [id]);
    return { deleted: true };
  }
}
