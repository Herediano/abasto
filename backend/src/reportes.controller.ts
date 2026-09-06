import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';
import { RequirePermission } from './require-permission.decorator';

type Period = 'hoy' | 'semana' | 'mes' | 'anio';

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
   * frontend deriva ticket promedio; el margen necesita el costo al momento de
   * la venta, que hoy no se guarda (pendiente en docs/diseno.md).
   */
  @Get('ventas')
  @RequirePermission('ventas.ver')
  async ventas(@Req() request: AuthRequest, @Query('period') periodRaw?: string) {
    const tenantId = request.user.tenantId;
    const period: Period = (['hoy', 'semana', 'mes', 'anio'] as const).includes(periodRaw as Period)
      ? (periodRaw as Period)
      : 'semana';
    const cfg = CFG[period];

    const [cur, prev] = await Promise.all([
      this.serie(tenantId, cfg.slot, `occurred_at >= ${cfg.start} AND occurred_at < now()`, cfg.n),
      this.serie(tenantId, cfg.slot, `occurred_at >= ${cfg.start} - ${cfg.shift} AND occurred_at < now() - ${cfg.shift}`, cfg.n),
    ]);

    // El período anterior se muestra completo sólo hasta donde llegó el actual.
    const hasta = cur.fact.reduce<number>((last, v, i) => (v != null ? i : last), -1);

    return {
      period,
      labels: LABELS[period],
      fact: cur.fact,
      tick: cur.tick,
      prevFact: prev.fact.map((v, i) => (i <= hasta ? v ?? 0 : v)),
      prevTick: prev.tick.map((v, i) => (i <= hasta ? v ?? 0 : v)),
    };
  }

  private async serie(tenantId: string, slot: string, windowSql: string, n: number) {
    const rows = await this.prisma.$queryRawUnsafe<{ slot: number; fact: number; tick: number }[]>(
      `SELECT (${slot}) AS slot, SUM(total)::float8 AS fact, COUNT(*)::int AS tick
       FROM sales
       WHERE tenant_id = $1::uuid AND status = 'confirmed' AND ${windowSql}
       GROUP BY 1`,
      tenantId,
    );
    const fact: (number | null)[] = Array(n).fill(null);
    const tick: (number | null)[] = Array(n).fill(null);
    for (const r of rows) {
      const i = Number(r.slot);
      if (i >= 0 && i < n) {
        fact[i] = (fact[i] ?? 0) + Number(r.fact);
        tick[i] = (tick[i] ?? 0) + Number(r.tick);
      }
    }
    return { fact, tick };
  }
}
