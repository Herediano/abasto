import { BadRequestException, Body, Controller, Inject, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';
import { AdminGuard } from './admin.guard';
import { priceChange } from './price-history.util';
import { guardarPrecio, resolverPrecios } from './price-resolver.util';

type ScopeType = 'all' | 'category' | 'brand' | 'ids';
type Target = 'salePrice' | 'costPrice';
type OperationType = 'percent' | 'margin' | 'round';
type Rounding = 'nearest10' | 'nearest100' | 'ending99';

type BulkBody = {
  scope?: { type?: string; value?: string; ids?: unknown };
  target?: string;
  operation?: { type?: string; value?: unknown; rounding?: string };
  dryRun?: boolean;
  priceListId?: string;
  validFrom?: string;
};

const SCOPES: ScopeType[] = ['all', 'category', 'brand', 'ids'];
const TARGETS: Target[] = ['salePrice', 'costPrice'];
const OPERATIONS: OperationType[] = ['percent', 'margin', 'round'];
const ROUNDINGS: Rounding[] = ['nearest10', 'nearest100', 'ending99'];

// Tope de filas devueltas en la vista previa: el calculo se hace sobre todo el
// alcance, pero mandar 6000 filas al navegador no aporta nada.
const PREVIEW_LIMIT = 100;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function applyRounding(value: number, rounding: Rounding) {
  if (rounding === 'nearest10') return Math.round(value / 10) * 10;
  if (rounding === 'nearest100') return Math.round(value / 100) * 100;
  // ending99: al terminado en 99 MAS CERCANO, para arriba o para abajo.
  // Siempre bajar haria perder margen en cada pasada.
  const base = Math.floor(value / 100) * 100;
  const bajo = base - 1;
  const alto = base + 99;
  if (bajo < 0) return alto;
  return value - bajo <= alto - value ? bajo : alto;
}

@Controller('prices')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PricesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Lista sobre la que opera el pedido: la indicada o, si no vino, la base del tenant. */
  private async resolverLista(tenantId: string, priceListId?: string) {
    const lista = priceListId
      ? await this.prisma.priceList.findFirst({ where: { id: priceListId, tenantId } })
      : await this.prisma.priceList.findFirst({ where: { tenantId, isDefault: true } });
    if (!lista) throw new BadRequestException('Lista de precios no encontrada');
    return lista;
  }

  @Post('bulk')
  async bulk(@Req() request: AuthRequest, @Body() body: BulkBody) {
    const tenantId = request.user.tenantId;

    const scopeType = body.scope?.type as ScopeType | undefined;
    if (!scopeType || !SCOPES.includes(scopeType)) throw new UnprocessableEntityException('scope.type no es válido');
    const target = body.target as Target | undefined;
    if (!target || !TARGETS.includes(target)) throw new UnprocessableEntityException('target debe ser salePrice o costPrice');
    const operationType = body.operation?.type as OperationType | undefined;
    if (!operationType || !OPERATIONS.includes(operationType)) throw new UnprocessableEntityException('operation.type no es válido');

    const rawValue = Number(body.operation?.value);
    if (operationType !== 'round' && !Number.isFinite(rawValue)) throw new UnprocessableEntityException('operation.value debe ser un número');
    if (operationType === 'margin' && rawValue < 0) throw new UnprocessableEntityException('El margen no puede ser negativo');
    if (operationType === 'percent' && rawValue <= -100) throw new UnprocessableEntityException('Un descuento de 100% o más dejaría el precio en cero o negativo');

    const rounding = body.operation?.rounding as Rounding | undefined;
    if (operationType === 'round' && (!rounding || !ROUNDINGS.includes(rounding))) throw new UnprocessableEntityException('operation.rounding no es válido');

    if (operationType === 'margin' && target !== 'salePrice') throw new UnprocessableEntityException('El margen sólo aplica al precio de venta');

    const ids = Array.isArray(body.scope?.ids) ? (body.scope!.ids as unknown[]).filter((id): id is string => typeof id === 'string') : [];
    if (scopeType === 'ids' && !ids.length) throw new UnprocessableEntityException('Elegí al menos un producto');
    if ((scopeType === 'category' || scopeType === 'brand') && !body.scope?.value) throw new UnprocessableEntityException('Falta el valor del alcance');

    const where: Prisma.ProductWhereInput = {
      tenantId,
      isActive: true,
      ...(scopeType === 'category' ? { categoryId: body.scope!.value } : {}),
      ...(scopeType === 'brand' ? { brand: body.scope!.value } : {}),
      ...(scopeType === 'ids' ? { id: { in: ids } } : {}),
    };

    const lista = await this.resolverLista(tenantId, body.priceListId);
    // Aumentar una lista derivada crearia precios explicitos para cada producto,
    // congelandolos y rompiendo la derivacion sin que se note. Mejor frenarlo.
    if (target === 'salePrice' && lista.derivesFromId) {
      const padre = await this.prisma.priceList.findFirst({ where: { id: lista.derivesFromId }, select: { name: true } });
      throw new UnprocessableEntityException(
        `"${lista.name}" se calcula automáticamente desde "${padre?.name ?? 'otra lista'}". Actualizá esa lista y ésta se mueve sola, o convertila en lista independiente si querés precios propios.`,
      );
    }

    const validFrom = body.validFrom ? new Date(body.validFrom) : new Date();
    if (Number.isNaN(validFrom.getTime())) throw new UnprocessableEntityException('La fecha de aplicación no es válida');

    const products = await this.prisma.product.findMany({
      where,
      select: { id: true, name: true, costPrice: true, salePrice: true },
      orderBy: { name: 'asc' },
    });

    // Para precio de venta el valor actual sale de la lista, no de la cache.
    const preciosLista = target === 'salePrice'
      ? await resolverPrecios(this.prisma, tenantId, products.map(p => p.id), lista.id, validFrom)
      : new Map<string, Prisma.Decimal>();

    const actual = (p: { id: string; costPrice: Prisma.Decimal | null; salePrice: Prisma.Decimal | null }) =>
      target === 'costPrice' ? p.costPrice : preciosLista.get(p.id) ?? null;

    const changes: Array<{ id: string; name: string; before: number | null; after: number }> = [];
    // Productos que no se pueden calcular: no se inventan valores, se reportan.
    const skipped: Array<{ id: string; name: string; reason: string }> = [];

    for (const p of products) {
      const vigente = actual(p);
      // El margen se calcula sobre el costo; el resto, sobre el valor que se va a pisar.
      const source = operationType === 'margin' ? p.costPrice : vigente;
      if (source === null) {
        skipped.push({ id: p.id, name: p.name, reason: operationType === 'margin' ? 'sin precio de costo' : 'sin precio de origen' });
        continue;
      }
      const base = Number(source);
      const after = operationType === 'round' ? applyRounding(base, rounding!) : round2(base * (1 + rawValue / 100));

      if (after < 0) {
        skipped.push({ id: p.id, name: p.name, reason: 'el resultado sería negativo' });
        continue;
      }
      // "before" siempre es el valor actual de lo que se pisa, aunque el calculo
      // haya salido de otro campo (caso margen).
      const before = vigente === null ? null : Number(vigente);
      if (before !== null && round2(before) === after) continue;
      changes.push({ id: p.id, name: p.name, before, after });
    }

    const resumen = {
      affected: changes.length,
      skipped: skipped.length,
      skippedDetail: skipped.slice(0, PREVIEW_LIMIT),
      preview: changes.slice(0, PREVIEW_LIMIT),
      priceList: { id: lista.id, name: lista.name },
      scheduled: validFrom > new Date(),
      validFrom: validFrom.toISOString(),
    };
    if (body.dryRun) return { ...resumen, applied: false };

    for (let i = 0; i < changes.length; i += 500) {
      const batch = changes.slice(i, i + 500);
      await this.prisma.$transaction(async tx => {
        for (const c of batch) {
          if (target === 'costPrice') {
            // El costo no vive en listas: sigue en el producto, con su historial.
            await tx.product.update({ where: { id: c.id }, data: { costPrice: c.after } });
            const h = priceChange({ tenantId, productId: c.id, field: 'cost', before: c.before, after: c.after, source: 'bulk', userId: request.user.id });
            if (h) await tx.productPriceHistory.create({ data: h });
          } else {
            await guardarPrecio(tx, { tenantId, productId: c.id, priceListId: lista.id, price: c.after, validFrom, source: 'bulk', userId: request.user.id });
          }
        }
      });
    }

    return { ...resumen, applied: true };
  }
}
