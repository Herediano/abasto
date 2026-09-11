import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, UnprocessableEntityException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { activarPreciosVigentes, guardarPrecio } from './price-resolver.util';
import { priceChange, type PriceHistoryEntry } from './price-history.util';
import { PRICE_IMPORT_FIELDS, planPriceRows, type PrecioActual, type PricePlanRow } from './price-import.util';
import { autoMap, cell, readSheet, type ColumnMapping } from './sheet-import.util';
import { PricesService, type BulkInput, type BulkTierInput } from './prices.service';

const MODOS_REDONDEO = ['nearest10', 'nearest100', 'ending99', 'none'];

@Controller('prices')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission('precios.editar')
export class PricesController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PricesService) private readonly prices: PricesService,
  ) {}

  @Post('bulk')
  bulk(@Req() request: AuthRequest, @Body() body: BulkInput) {
    return this.prices.ejecutar(request.user.tenantId, request.user.id, body);
  }

  /** Precio por cantidad para toda una selección: "desde N unidades, X% menos". */
  @Post('bulk-tier')
  bulkTier(@Req() request: AuthRequest, @Body() body: BulkTierInput) {
    return this.prices.ejecutarEscala(request.user.tenantId, request.user.id, body);
  }

  /**
   * Cuántos productos entran en una selección, con una muestra. Alimenta el
   * contador en vivo de la pantalla: usa el mismo camino que la actualización,
   * así lo que dice el contador es exactamente lo que se va a tocar.
   */
  @Post('selection/count') @RequirePermission('precios.ver')
  count(@Req() request: AuthRequest, @Body() body: BulkInput) {
    return this.prices.contar(request.user.tenantId, body);
  }

  // --- importacion de precios (mismo wizard que productos) ---

  /** Catálogo de columnas que entiende el importador de precios (para el wizard). */
  @Get('import-fields')
  importFields() {
    return { fields: PRICE_IMPORT_FIELDS };
  }

  /**
   * Importa costo y venta desde Excel/CSV sobre productos que ya existen, en las
   * mismas 3 fases que el importador de productos (se re-sube el archivo en cada
   * una; son chicos):
   *  - `phase=inspect` (sin mapping): encabezados, mapeo sugerido y filas de muestra.
   *  - `phase=preview` + `mapping`: qué cambiaría, sin tocar nada.
   *  - `phase=apply` + `mapping`: lo aplica.
   *
   * No crea productos: para eso está el importador de Productos. Lo que no está
   * en el catálogo se cuenta como salteado y se ve en la previa.
   */
  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  async import(
    @Req() request: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { mapping?: string; phase?: string },
  ) {
    if (!file) throw new BadRequestException('Subí un archivo .csv o .xlsx');
    const tenantId = request.user.tenantId;
    const userId = request.user.id;
    const phase = body.phase === 'apply' ? 'apply' : body.phase === 'preview' ? 'preview' : 'inspect';

    const sheet = await readSheet(file.buffer, file.originalname);
    if (!sheet.headers.length) throw new UnprocessableEntityException('El archivo está vacío o no se pudo leer');
    if (sheet.rows.length > 10000) throw new UnprocessableEntityException('El archivo tiene demasiadas filas (máximo 10.000 por vez)');

    if (phase === 'inspect') {
      const conDatos = sheet.rows.filter(r => r.some(c => c.trim()));
      return {
        headers: sheet.headers,
        rowCount: conDatos.length,
        suggested: autoMap(sheet.headers, PRICE_IMPORT_FIELDS),
        sampleRows: conDatos.slice(0, 5),
      };
    }

    let mapping: ColumnMapping = {};
    try { mapping = { ...(JSON.parse(body.mapping || '{}') as ColumnMapping) }; }
    catch { throw new BadRequestException('El mapeo de columnas no es válido'); }
    if (mapping.barcode == null || mapping.barcode < 0) {
      throw new UnprocessableEntityException('Falta indicar qué columna tiene el código de barras');
    }
    const mapeado = (k: string) => mapping[k] != null && mapping[k] >= 0;
    if (!mapeado('costPrice') && !mapeado('salePrice') && !mapeado('name')) {
      throw new UnprocessableEntityException('Mapeá al menos una columna de precio (costo o venta). Sin eso no hay nada que importar.');
    }

    const barcodes = [...new Set(sheet.rows.map(r => cell(r, mapping, 'barcode')).filter(Boolean))];
    const products = await this.prisma.product.findMany({
      where: { tenantId, barcode: { in: barcodes } },
      select: { id: true, barcode: true, name: true, costPrice: true, salePrice: true },
    });
    // Las escalas del importador viven en la lista base, igual que el precio de
    // venta: es la que resuelve la caja. Sin lista base no hay tiers previos que
    // comparar, pero igual se arma el mapa vacío para no romper el diff.
    const listaBaseId = (await this.prisma.priceList.findFirst({ where: { tenantId, isDefault: true }, select: { id: true } }))?.id;
    const tiersExistentes = listaBaseId
      ? await this.prisma.priceTier.findMany({ where: { tenantId, priceListId: listaBaseId, productId: { in: products.map(p => p.id) } } })
      : [];
    const tiersPorProducto = new Map<string, Map<number, number>>();
    for (const t of tiersExistentes) {
      const mapa = tiersPorProducto.get(t.productId) ?? new Map<number, number>();
      mapa.set(Number(t.minQty), Number(t.price));
      tiersPorProducto.set(t.productId, mapa);
    }
    const existingByBarcode = new Map<string, PrecioActual>(products.map(p => [p.barcode, {
      id: p.id,
      name: p.name,
      cost: p.costPrice === null ? null : Number(p.costPrice),
      sale: p.salePrice === null ? null : Number(p.salePrice),
      tiers: tiersPorProducto.get(p.id),
    }]));

    const plan = planPriceRows({ sheet, mapping, existingByBarcode });
    const updates = plan.filter((p): p is Extract<PricePlanRow, { kind: 'update' }> => p.kind === 'update');
    const errors = plan.filter((p): p is Extract<PricePlanRow, { kind: 'error' }> => p.kind === 'error');
    const skipped = plan.filter(p => p.kind === 'skip').length;

    if (phase === 'preview') {
      return {
        // Este importador nunca crea: el wizard lo muestra en cero a propósito.
        willCreate: 0,
        willUpdate: updates.length,
        skipped,
        errors: errors.map(e => ({ row: e.rowNumber, message: e.message })),
        sample: updates.slice(0, 15).map(p => ({
          barcode: p.barcode,
          action: 'Actualizar',
          campos: [
            ...(p.cost !== undefined ? ['costo'] : []),
            ...(p.sale !== undefined ? ['venta'] : []),
            ...(p.name !== undefined ? ['nombre'] : []),
            ...(p.tiers ?? []).map(t => `escala x${t.minQty}`),
          ],
        })),
      };
    }

    // Los precios de venta y las escalas se escriben en la lista base, que es
    // la que la caja resuelve al cobrar. Sin lista base no hay dónde ponerlos.
    const listaBase = listaBaseId ? { id: listaBaseId } : null;
    if (updates.some(p => p.sale !== undefined || p.tiers) && !listaBase) {
      throw new UnprocessableEntityException('No hay una lista de precios base configurada. Creá una en Precios antes de importar.');
    }

    let updated = 0;
    for (let i = 0; i < updates.length; i += 500) {
      const batch = updates.slice(i, i + 500);
      await this.prisma.$transaction(async tx => {
        const historia: PriceHistoryEntry[] = [];
        for (const fila of batch) {
          const actual = existingByBarcode.get(fila.barcode)!;
          const datos: { costPrice?: number; name?: string } = {};
          if (fila.cost !== undefined) {
            datos.costPrice = fila.cost;
            const h = priceChange({ tenantId, productId: fila.productId, field: 'cost', before: actual.cost, after: fila.cost, source: 'import', userId });
            if (h) historia.push(h);
          }
          if (fila.name !== undefined) datos.name = fila.name;
          if (datos.costPrice !== undefined || datos.name !== undefined) {
            await tx.product.update({ where: { id: fila.productId }, data: datos });
          }
          // El costo es un campo del producto. El precio de venta NO: vive en
          // ProductPrice, que es de donde la caja resuelve cuánto cobrar.
          // guardarPrecio crea esa fila y refresca la caché Product.salePrice.
          if (fila.sale !== undefined) {
            const h = priceChange({ tenantId, productId: fila.productId, field: 'sale', before: actual.sale, after: fila.sale, source: 'import', userId });
            if (h) historia.push(h);
            await guardarPrecio(tx, { tenantId, productId: fila.productId, priceListId: listaBase!.id, price: fila.sale, source: 'import', userId });
          }
          // Precio por cantidad: mismo mecanismo que cargarlo a mano en la ficha
          // del producto, pero vía planilla. Sin columna mapeada, el producto
          // sigue con precio único — nunca se le inventa una escala.
          for (const t of fila.tiers ?? []) {
            await tx.priceTier.upsert({
              where: { tenantId_priceListId_productId_minQty: { tenantId, priceListId: listaBase!.id, productId: fila.productId, minQty: t.minQty } },
              create: { tenantId, priceListId: listaBase!.id, productId: fila.productId, minQty: t.minQty, price: t.price },
              update: { price: t.price },
            });
          }
          updated++;
        }
        if (historia.length) await tx.productPriceHistory.createMany({ data: historia });
      });
    }

    return {
      created: 0,
      updated,
      skipped,
      errors: errors.map(e => ({ row: e.rowNumber, message: e.message })),
    };
  }

  // --- cambios programados ---

  /**
   * Precios cargados con fecha futura, agrupados por lista y fecha: es la vista
   * de "lo que va a entrar en vigencia" y desde donde se cancelan.
   */
  @Get('scheduled') @RequirePermission('precios.ver')
  async scheduled(@Req() request: AuthRequest) {
    const tenantId = request.user.tenantId;
    const filas = await this.prisma.productPrice.findMany({
      where: { tenantId, validFrom: { gt: new Date() } },
      include: { priceList: { select: { name: true } } },
      orderBy: { validFrom: 'asc' },
    });
    const grupos = new Map<string, { priceListId: string; priceListName: string; validFrom: string; products: number; source: string }>();
    for (const f of filas) {
      const clave = `${f.priceListId}|${f.validFrom.toISOString()}`;
      const g = grupos.get(clave);
      if (g) g.products++;
      else grupos.set(clave, { priceListId: f.priceListId, priceListName: f.priceList.name, validFrom: f.validFrom.toISOString(), products: 1, source: f.source });
    }
    return [...grupos.values()];
  }

  /** Cancela un lote programado. Sólo toca filas futuras: lo vigente no se puede borrar. */
  @Delete('scheduled')
  async cancelScheduled(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    if (!query.priceListId || !query.validFrom) throw new BadRequestException('Indicá la lista y la fecha del cambio a cancelar');
    const validFrom = new Date(query.validFrom);
    if (Number.isNaN(validFrom.getTime())) throw new UnprocessableEntityException('La fecha no es válida');
    if (validFrom <= new Date()) throw new UnprocessableEntityException('Ese cambio ya está vigente y no se puede cancelar');
    const { count } = await this.prisma.productPrice.deleteMany({
      where: { tenantId, priceListId: query.priceListId, validFrom },
    });
    return { cancelled: count };
  }

  /** Fuerza el refresco de la caché. El job lo hace solo, esto es para probar. */
  @Post('activate')
  async activate() {
    return { updated: await activarPreciosVigentes(this.prisma) };
  }

  /**
   * Auditoría: quién tocó qué precio, cuándo y desde dónde.
   *
   * Los datos viven en dos tablas por diseño: product_prices guarda los precios
   * de venta (con su lista y vigencia) y product_price_history los de costo, que
   * no pertenecen a ninguna lista. Se unifican acá para leerlos como una sola
   * línea de tiempo.
   */
  @Get('audit') @RequirePermission('precios.ver')
  async audit(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    const limit = Math.min(200, Math.max(1, Number.parseInt(query.limit ?? '100', 10) || 100));
    const desde = query.from ? new Date(`${query.from}T00:00:00`) : undefined;
    const hasta = query.to ? new Date(`${query.to}T23:59:59.999`) : undefined;
    const rango = desde || hasta ? { gte: desde, lte: hasta } : undefined;
    const productId = query.productId || undefined;
    const source = query.source || undefined;

    const [ventas, costos, usuarios] = await Promise.all([
      // El precio anterior no se guarda: es la fila previa de la misma lista, y
      // se resuelve abajo ordenando por producto y fecha.
      query.field === 'cost' ? [] : this.prisma.productPrice.findMany({
        where: { tenantId, ...(rango ? { createdAt: rango } : {}), ...(productId ? { productId } : {}), ...(source ? { source } : {}) },
        include: { product: { select: { name: true } }, priceList: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      query.field === 'sale' ? [] : this.prisma.productPriceHistory.findMany({
        where: { tenantId, field: 'cost', ...(rango ? { createdAt: rango } : {}), ...(productId ? { productId } : {}), ...(source ? { source } : {}) },
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);

    const nombreUsuario = new Map(usuarios.map(u => [u.id, u.name]));

    // Para cada precio de venta, el anterior de esa misma lista y producto.
    const previos = new Map<string, number>();
    const porClave = new Map<string, typeof ventas>();
    for (const v of ventas) {
      const clave = `${v.productId}|${v.priceListId}`;
      porClave.set(clave, [...(porClave.get(clave) ?? []), v]);
    }
    for (const [clave, filas] of porClave) {
      const anteriores = await this.prisma.productPrice.findMany({
        where: { tenantId, productId: filas[0].productId, priceListId: filas[0].priceListId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, price: true },
      });
      for (let i = 0; i < anteriores.length - 1; i++) previos.set(`${clave}|${anteriores[i].id}`, Number(anteriores[i + 1].price));
    }

    const items = [
      ...ventas.map(v => ({
        id: v.id,
        at: v.createdAt.toISOString(),
        productId: v.productId,
        productName: v.product.name,
        field: 'sale' as const,
        scope: v.priceList.name,
        before: previos.get(`${v.productId}|${v.priceListId}|${v.id}`) ?? null,
        after: Number(v.price),
        source: v.source,
        userName: v.userId ? nombreUsuario.get(v.userId) ?? null : null,
        validFrom: v.validFrom.toISOString(),
      })),
      ...costos.map(c => ({
        id: c.id,
        at: c.createdAt.toISOString(),
        productId: c.productId,
        productName: c.product.name,
        field: 'cost' as const,
        scope: null,
        before: c.oldValue === null ? null : Number(c.oldValue),
        after: Number(c.newValue),
        source: c.source,
        userName: c.userId ? nombreUsuario.get(c.userId) ?? null : null,
        validFrom: c.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit);

    return { items };
  }

  // --- costos pendientes de sincronizar (compras con "actualizar costo automático" apagado) ---

  @Get('pending-costs') @RequirePermission('precios.ver')
  pendingCosts(@Req() request: AuthRequest) {
    return this.prices.costosPendientes(request.user.tenantId);
  }

  @Post('pending-costs/sync')
  async syncPendingCosts(@Req() request: AuthRequest, @Body() body: { productIds?: unknown }) {
    const productIds = Array.isArray(body.productIds) ? body.productIds.filter((id): id is string => typeof id === 'string') : [];
    if (!productIds.length) throw new BadRequestException('productIds es obligatorio');
    return this.prices.sincronizarCostos(request.user.tenantId, request.user.id, productIds);
  }

  // --- politica de redondeo por tramo ---

  @Get('rounding-rules') @RequirePermission('precios.ver')
  roundingRules(@Req() request: AuthRequest) {
    return this.prisma.roundingRule.findMany({ where: { tenantId: request.user.tenantId }, orderBy: { fromAmount: 'asc' } });
  }

  @Post('rounding-rules')
  async createRoundingRule(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    const tenantId = request.user.tenantId;
    const fromAmount = Number(body.fromAmount);
    if (!Number.isFinite(fromAmount) || fromAmount < 0) throw new UnprocessableEntityException('El monto desde debe ser un número mayor o igual a cero');
    const toAmount = body.toAmount === null || body.toAmount === undefined || body.toAmount === '' ? null : Number(body.toAmount);
    if (toAmount !== null && (!Number.isFinite(toAmount) || toAmount <= fromAmount)) {
      throw new UnprocessableEntityException('El monto hasta tiene que ser mayor que el monto desde');
    }
    const mode = typeof body.mode === 'string' ? body.mode : '';
    if (!MODOS_REDONDEO.includes(mode)) throw new UnprocessableEntityException(`El modo debe ser uno de: ${MODOS_REDONDEO.join(', ')}`);

    // Los tramos no se pueden pisar: con dos reglas cubriendo el mismo monto,
    // cual gana dependeria del orden de la consulta.
    const existentes = await this.prisma.roundingRule.findMany({ where: { tenantId } });
    const solapa = existentes.some(r => {
      const rHasta = r.toAmount === null ? Infinity : Number(r.toAmount);
      const nHasta = toAmount === null ? Infinity : toAmount;
      return fromAmount < rHasta && Number(r.fromAmount) < nHasta;
    });
    if (solapa) throw new UnprocessableEntityException('Ese tramo se superpone con otro ya cargado');

    return this.prisma.roundingRule.create({ data: { tenantId, fromAmount, toAmount, mode } });
  }

  @Delete('rounding-rules/:id')
  async deleteRoundingRule(@Req() request: AuthRequest, @Param('id') id: string) {
    const encontrada = await this.prisma.roundingRule.findFirst({ where: { id, tenantId: request.user.tenantId } });
    if (!encontrada) throw new BadRequestException('Tramo no encontrado');
    await this.prisma.roundingRule.delete({ where: { id } });
    return { deleted: true };
  }
}
