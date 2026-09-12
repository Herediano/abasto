import { Controller, Get, Inject, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';
import { sendExport, type ExportColumn } from './export.util';

type Period = 'hoy' | 'semana' | 'mes' | 'anio';

const PAGO_LABEL: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', qr: 'QR', account: 'Cuenta corriente',
};
const MONEY_FMT = '#,##0.00';

// Todo se resuelve en SQL contra la zona horaria de la base — las columnas son
// `timestamp without time zone` y los `@default(now())` se guardan en hora
// local, así que mezclar con `Date` de Node desfasa las comparaciones.
const CFG: Record<Period, { slot: string; start: string; shift: string; n: number }> = {
  hoy: { slot: 'GREATEST(0, LEAST(13, EXTRACT(HOUR FROM occurred_at)::int - 8))', start: "date_trunc('day', now())", shift: "interval '1 day'", n: 14 },
  semana: { slot: '((EXTRACT(DOW FROM occurred_at)::int + 6) % 7)', start: "date_trunc('week', now())", shift: "interval '7 days'", n: 7 },
  mes: { slot: 'LEAST(4, FLOOR((EXTRACT(DAY FROM occurred_at)::int - 1) / 7))::int', start: "date_trunc('month', now())", shift: "interval '1 month'", n: 5 },
  anio: { slot: 'EXTRACT(MONTH FROM occurred_at)::int - 1', start: "date_trunc('year', now())", shift: "interval '1 year'", n: 12 },
};

const LABELS: Record<Period, string[]> = {
  hoy: ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'],
  semana: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  mes: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'],
  anio: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
};

@Controller('reportes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Serie de ventas para el gráfico del módulo Ventas: el período elegido y el
   * anterior comparable, en cubetas (horas / días / semanas / meses). El
   * frontend deriva el ticket promedio. El margen usa `sale_lines.unit_cost`
   * —el costo congelado al vender— contra el subtotal neto de promociones; las
   * líneas sin costo cargado cuentan como costo 0.
   */
  @Get('ventas')
  @RequirePermission('ventas.ver')
  async ventas(@Req() request: AuthRequest, @Query('period') periodRaw?: string) {
    const tenantId = request.user.tenantId;
    const period: Period = (['hoy', 'semana', 'mes', 'anio'] as const).includes(periodRaw as Period)
      ? (periodRaw as Period)
      : 'semana';
    const cfg = CFG[period];

    const whIds = request.user.branchWarehouseIds ?? [];
    const [cur, prev] = await Promise.all([
      this.serie(tenantId, whIds, cfg.slot, `occurred_at >= ${cfg.start} AND occurred_at < now()`, cfg.n),
      this.serie(tenantId, whIds, cfg.slot, `occurred_at >= ${cfg.start} - ${cfg.shift} AND occurred_at < now() - ${cfg.shift}`, cfg.n),
    ]);

    // El período anterior se muestra completo sólo hasta donde llegó el actual.
    const hasta = cur.fact.reduce<number>((last, v, i) => (v != null ? i : last), -1);

    return {
      period,
      labels: LABELS[period],
      fact: cur.fact,
      tick: cur.tick,
      marg: cur.marg,
      prevFact: prev.fact.map((v, i) => (i <= hasta ? v ?? 0 : v)),
      prevTick: prev.tick.map((v, i) => (i <= hasta ? v ?? 0 : v)),
      prevMarg: prev.marg.map((v, i) => (i <= hasta ? v ?? 0 : v)),
    };
  }

  /**
   * Panel de reportes del encargado / dueño: varios bloques en una sola llamada,
   * para un rango de fechas (por defecto los últimos 30 días). Todo lo que
   * depende de un depósito va acotado a la sucursal activa, salvo la comparativa
   * entre sucursales, que siempre muestra todas.
   */
  @Get('panel')
  @RequirePermission('reportes.ver')
  panel(@Req() request: AuthRequest, @Query() query: Record<string, string | undefined>) {
    return this.buildPanel(request, query);
  }

  /**
   * Una sección del panel como Excel/CSV (`?section=<clave>&from=&to=&format=`).
   * Reusa exactamente el mismo cálculo que `/panel`; sólo elige qué columnas y
   * filas mandar. Ver docs/diseno.md, «Exportar — la salida universal».
   */
  @Get('panel/export')
  @RequirePermission('reportes.ver')
  async panelExport(
    @Req() request: AuthRequest,
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ) {
    const d = await this.buildPanel(request, query);
    const M = (key: string): ExportColumn => ({ header: '', key, numFmt: MONEY_FMT, width: 16 });
    const sections: Record<string, { name: string; columns: ExportColumn[]; rows: Record<string, unknown>[] }> = {
      medioDePago: {
        name: 'ventas-por-medio-de-pago',
        columns: [{ header: 'Medio', key: 'medio', width: 20 }, { header: 'Operaciones', key: 'ops' }, { ...M('total'), header: 'Total' }],
        rows: d.porMedioDePago.map(m => ({ medio: PAGO_LABEL[m.method] ?? m.method, ops: m.count, total: m.total })),
      },
      cajero: {
        name: 'ventas-por-cajero',
        columns: [{ header: 'Cajero', key: 'cajero', width: 24 }, { header: 'Tickets', key: 'tickets' }, { ...M('total'), header: 'Total' }],
        rows: d.porCajero.map(c => ({ cajero: c.name, tickets: c.count, total: c.total })),
      },
      sucursales: {
        name: 'ventas-por-sucursal',
        columns: [{ header: 'Sucursal', key: 'sucursal', width: 28 }, { header: 'Tickets', key: 'tickets' }, { ...M('total'), header: 'Total' }],
        rows: d.porSucursal.map(s => ({ sucursal: s.warehouse !== s.branch ? `${s.branch} · ${s.warehouse}` : s.branch, tickets: s.count, total: s.total })),
      },
      masVendidos: {
        name: 'mas-vendidos',
        columns: [
          { header: 'Producto', key: 'producto', width: 34 },
          { header: 'Unidades', key: 'unidades' },
          { ...M('facturado'), header: 'Facturado' },
          ...(d.verPlata ? [{ ...M('margen'), header: 'Margen' }] : []),
        ],
        rows: d.masVendidos.map(r => ({ producto: r.name, unidades: r.qty, facturado: r.revenue, margen: r.margin ?? '' })),
      },
      sinRotacion: {
        name: 'sin-rotacion',
        columns: [
          { header: 'Producto', key: 'producto', width: 34 },
          { header: 'Stock', key: 'stock' },
          { header: 'Última venta', key: 'ultimaVenta', numFmt: 'dd/mm/yyyy' },
          ...(d.verPlata ? [{ ...M('valorizado'), header: 'Valorizado' }] : []),
        ],
        rows: d.sinRotacion.map(r => ({ producto: r.name, stock: r.stock, ultimaVenta: r.lastSaleAt ? new Date(r.lastSaleAt) : '', valorizado: r.valorizado ?? '' })),
      },
      arqueos: {
        name: 'arqueos-con-diferencia',
        columns: [
          { header: 'Caja', key: 'caja', width: 20 },
          { header: 'Cerró', key: 'cerro', width: 22 },
          { header: 'Fecha', key: 'fecha', numFmt: 'dd/mm/yyyy' },
          { ...M('diferencia'), header: 'Diferencia' },
        ],
        rows: d.arqueosConDiferencia.map(a => ({ caja: a.cashRegister, cerro: a.closedBy, fecha: a.closedAt ? new Date(a.closedAt) : '', diferencia: a.difference })),
      },
      cuentas: {
        name: 'cuentas-corrientes',
        columns: [{ header: 'Cliente', key: 'cliente', width: 30 }, { ...M('saldo'), header: 'Saldo' }, { ...M('limite'), header: 'Límite' }],
        rows: d.cuentasCorrientes.map(c => ({ cliente: c.name, saldo: c.balance, limite: c.creditLimit ?? '' })),
      },
    };
    const s = sections[query.section ?? ''];
    if (!s) {
      res.status(400).json({ code: 'BAD_SECTION', message: 'Sección de reporte desconocida' });
      return;
    }
    const rango = `${d.range.from}_${d.range.to}`;
    await sendExport(res, query.format, `${s.name}_${rango}`, s.columns, s.rows);
  }

  private async buildPanel(request: AuthRequest, query: Record<string, string | undefined>) {
    const tenantId = request.user.tenantId;
    const whIds = request.user.branchWarehouseIds ?? [];
    const desde = query.from ? new Date(`${query.from}T00:00:00`) : new Date(Date.now() - 30 * 864e5);
    const hasta = query.to ? new Date(`${query.to}T23:59:59.999`) : new Date();
    const enRango = { gte: desde, lte: hasta };
    const ventaWhere = { tenantId, status: 'confirmed', occurredAt: enRango, warehouseId: { in: whIds } };
    const verPlata = request.user.permissions.has('reportes.ver_plata');

    const [porMedio, porCajero, porSucursalRaw, masVendidosRaw, sinRotacionRaw, stockValRaw, arqueos, ctaCte, saleAgg] = await Promise.all([
      this.prisma.salePayment.groupBy({
        by: ['method'],
        where: { tenantId, sale: { status: 'confirmed', occurredAt: enRango, warehouseId: { in: whIds } } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.sale.groupBy({ by: ['userId'], where: ventaWhere, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.sale.groupBy({ by: ['warehouseId'], where: { tenantId, status: 'confirmed', occurredAt: enRango }, _sum: { total: true }, _count: { _all: true } }),
      whIds.length === 0 ? Promise.resolve([]) : this.prisma.$queryRawUnsafe<Array<{ productId: string; name: string; qty: number; revenue: number; margin: number }>>(
        `SELECT l.product_id AS "productId", p.name, SUM(l.quantity)::float8 AS qty,
               SUM(l.line_subtotal)::float8 AS revenue,
               SUM(l.line_subtotal - COALESCE(l.unit_cost,0) * l.quantity)::float8 AS margin
        FROM sale_lines l JOIN sales s ON s.id = l.sale_id JOIN products p ON p.id = l.product_id
        WHERE s.tenant_id = $1::uuid AND s.status = 'confirmed'
          AND s.occurred_at BETWEEN $2 AND $3
          AND s.warehouse_id = ANY($4::uuid[])
        GROUP BY l.product_id, p.name ORDER BY qty DESC LIMIT 15`,
        tenantId, desde, hasta, whIds,
      ),
      // El complemento de "más vendidos": productos con stock en el depósito
      // pero sin una sola línea de venta en el rango — plata parada en la
      // góndola. lastSaleAt mira TODA la historia (no sólo el rango), para
      // poder decir "no se vendió nunca" vs. "no se vendió desde tal fecha".
      whIds.length === 0 ? Promise.resolve([]) : this.prisma.$queryRawUnsafe<Array<{ productId: string; name: string; stock: number; valorizado: number; lastSaleAt: string | null }>>(
        `SELECT q.product_id AS "productId", p.name, q.stock::float8 AS stock,
               (q.stock * COALESCE(p.cost_price, 0))::float8 AS valorizado,
               ult.last_sale_at AS "lastSaleAt"
        FROM (
          SELECT sm.product_id, SUM(sm.quantity) AS stock
          FROM stock_movements sm
          WHERE sm.tenant_id = $1::uuid AND sm.warehouse_id = ANY($2::uuid[])
          GROUP BY sm.product_id HAVING SUM(sm.quantity) > 0
        ) q
        JOIN products p ON p.id = q.product_id AND p.is_active
        LEFT JOIN LATERAL (
          SELECT MAX(s.occurred_at) AS last_sale_at
          FROM sale_lines l JOIN sales s ON s.id = l.sale_id
          WHERE l.product_id = q.product_id AND s.tenant_id = $1::uuid AND s.status = 'confirmed' AND s.warehouse_id = ANY($2::uuid[])
        ) ult ON true
        WHERE NOT EXISTS (
          SELECT 1 FROM sale_lines l JOIN sales s ON s.id = l.sale_id
          WHERE l.product_id = q.product_id AND s.tenant_id = $1::uuid AND s.status = 'confirmed'
            AND s.warehouse_id = ANY($2::uuid[]) AND s.occurred_at BETWEEN $3 AND $4
        )
        ORDER BY valorizado DESC LIMIT 20`,
        tenantId, whIds, desde, hasta,
      ),
      whIds.length === 0 ? Promise.resolve([{ total: 0 }]) : this.prisma.$queryRawUnsafe<Array<{ total: number }>>(
        `SELECT COALESCE(SUM(q.stock * COALESCE(p.cost_price, 0)), 0)::float8 AS total
        FROM (
          SELECT sm.product_id, SUM(sm.quantity) AS stock
          FROM stock_movements sm
          WHERE sm.tenant_id = $1::uuid AND sm.warehouse_id = ANY($2::uuid[])
          GROUP BY sm.product_id HAVING SUM(sm.quantity) > 0
        ) q JOIN products p ON p.id = q.product_id`,
        tenantId, whIds,
      ),
      this.prisma.cashShift.findMany({
        where: { tenantId, status: 'closed', closedAt: enRango, cashDifference: { not: 0 }, cashRegister: { warehouseId: { in: whIds } } },
        orderBy: { closedAt: 'desc' },
        include: { cashRegister: { select: { name: true } }, closedBy: { select: { name: true } } },
        take: 50,
      }),
      this.prisma.customer.findMany({
        where: { tenantId, accountBalance: { not: 0 } },
        orderBy: { accountBalance: 'desc' },
        select: { id: true, name: true, accountBalance: true, creditLimit: true },
        take: 100,
      }),
      this.prisma.sale.aggregate({ where: ventaWhere, _sum: { total: true, surchargeTotal: true }, _count: { _all: true } }),
    ]);

    const usuarios = new Map((await this.prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true } })).map(u => [u.id, u.name]));
    const depositos = new Map((await this.prisma.warehouse.findMany({ where: { tenantId }, select: { id: true, name: true, branch: { select: { name: true } } } })).map(w => [w.id, w]));

    return {
      range: { from: desde.toISOString().slice(0, 10), to: hasta.toISOString().slice(0, 10) },
      verPlata,
      totales: {
        ventas: Number(saleAgg._sum.total ?? 0),
        tickets: saleAgg._count._all,
        recargos: Number(saleAgg._sum.surchargeTotal ?? 0),
      },
      porMedioDePago: porMedio.map(m => ({ method: m.method, total: Number(m._sum.amount ?? 0), count: m._count._all })),
      porCajero: porCajero.map(c => ({ name: usuarios.get(c.userId) ?? '—', total: Number(c._sum.total ?? 0), count: c._count._all })).sort((a, b) => b.total - a.total),
      porSucursal: porSucursalRaw.map(s => {
        const w = depositos.get(s.warehouseId);
        return { warehouse: w?.name ?? '—', branch: w?.branch?.name ?? '—', total: Number(s._sum.total ?? 0), count: s._count._all };
      }).sort((a, b) => b.total - a.total),
      masVendidos: masVendidosRaw.map(r => ({ name: r.name, qty: Number(r.qty), revenue: Number(r.revenue), margin: verPlata ? Number(r.margin) : null })),
      sinRotacion: sinRotacionRaw.map(r => ({
        name: r.name, stock: Number(r.stock), lastSaleAt: r.lastSaleAt,
        valorizado: verPlata ? Number(r.valorizado) : null,
      })),
      stockValorizado: verPlata ? Number(stockValRaw[0]?.total ?? 0) : null,
      arqueosConDiferencia: arqueos.map(s => ({
        id: s.id, cashRegister: s.cashRegister.name, closedBy: s.closedBy?.name ?? '—',
        closedAt: s.closedAt?.toISOString() ?? null, difference: Number(s.cashDifference ?? 0),
      })),
      cuentasCorrientes: ctaCte.map(c => ({ id: c.id, name: c.name, balance: Number(c.accountBalance), creditLimit: c.creditLimit === null ? null : Number(c.creditLimit) })),
    };
  }

  private async serie(tenantId: string, warehouseIds: string[], slot: string, windowSql: string, n: number) {
    const [ventas, margenes] = await Promise.all([
      this.prisma.$queryRawUnsafe<{ slot: number; fact: number; tick: number }[]>(
        `SELECT (${slot}) AS slot, SUM(total)::float8 AS fact, COUNT(*)::int AS tick
         FROM sales
         WHERE tenant_id = $1::uuid AND status = 'confirmed' AND warehouse_id = ANY($2::uuid[]) AND ${windowSql}
         GROUP BY 1`,
        tenantId,
        warehouseIds,
      ),
      this.prisma.$queryRawUnsafe<{ slot: number; marg: number }[]>(
        `SELECT (${slot}) AS slot,
                SUM(l.line_subtotal - COALESCE(l.unit_cost, 0) * l.quantity)::float8 AS marg
         FROM sale_lines l JOIN sales s ON s.id = l.sale_id
         WHERE s.tenant_id = $1::uuid AND s.status = 'confirmed' AND s.warehouse_id = ANY($2::uuid[]) AND ${windowSql}
         GROUP BY 1`,
        tenantId,
        warehouseIds,
      ),
    ]);
    const fact: (number | null)[] = Array(n).fill(null);
    const tick: (number | null)[] = Array(n).fill(null);
    const marg: (number | null)[] = Array(n).fill(null);
    for (const r of ventas) {
      const i = Number(r.slot);
      if (i >= 0 && i < n) {
        fact[i] = (fact[i] ?? 0) + Number(r.fact);
        tick[i] = (tick[i] ?? 0) + Number(r.tick);
      }
    }
    for (const r of margenes) {
      const i = Number(r.slot);
      if (i >= 0 && i < n) marg[i] = (marg[i] ?? 0) + Number(r.marg);
    }
    return { fact, tick, marg };
  }
}
