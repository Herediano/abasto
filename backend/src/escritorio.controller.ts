import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';

/**
 * El dato vivo de las tarjetas del escritorio. Una sola llamada devuelve el
 * bloque de cada módulo que el rango puede ver — un módulo sin permiso viene
 * como `null` y el frontend cae al texto genérico. Ver docs/diseno.md.
 *
 * Sin PermissionGuard: el gate es por bloque, no por endpoint (todos los rangos
 * pueden pedir su escritorio).
 */
@Controller('escritorio')
@UseGuards(JwtAuthGuard)
export class EscritorioController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async summary(@Req() request: AuthRequest) {
    const tenantId = request.user.tenantId;
    const can = (k: string) => request.user.permissions.has(k);
    // Los bloques de stock, ventas, caja y compras se acotan a la sucursal
    // activa; catálogo, precios y clientes son de toda la empresa.
    const whIds = request.user.branchWarehouseIds ?? [];

    const now = new Date();
    const out: Record<string, unknown> = {};

    // ---- Ventas: hoy (hasta ahora) vs el total de ayer y del mismo día de la
    // semana pasada. Se resuelve en SQL contra la zona horaria de la base
    // (las columnas son `timestamp without time zone`, mezclar con Date desfasa). ----
    if (can('ventas.ver')) {
      const [row] = await this.prisma.$queryRawUnsafe<
        { hoy: number; tickets: number; ayer: number; semana_pasada: number }[]
      >(
        `SELECT
           COALESCE(SUM(total) FILTER (WHERE occurred_at >= date_trunc('day', now())), 0)::float8 AS hoy,
           COUNT(*) FILTER (WHERE occurred_at >= date_trunc('day', now()))::int AS tickets,
           COALESCE(SUM(total) FILTER (WHERE occurred_at >= date_trunc('day', now()) - interval '1 day'
             AND occurred_at < date_trunc('day', now())), 0)::float8 AS ayer,
           COALESCE(SUM(total) FILTER (WHERE occurred_at >= date_trunc('day', now()) - interval '7 days'
             AND occurred_at < date_trunc('day', now()) - interval '6 days'), 0)::float8 AS semana_pasada
         FROM sales WHERE tenant_id = $1::uuid AND status = 'confirmed' AND warehouse_id = ANY($2::uuid[])`,
        tenantId,
        whIds,
      );
      out.ventas = {
        hoy: Number(row?.hoy ?? 0),
        tickets: Number(row?.tickets ?? 0),
        ayer: Number(row?.ayer ?? 0),
        semanaPasada: Number(row?.semana_pasada ?? 0),
      };
    }

    // ---- Caja: turno abierto ----
    if (can('caja.ver_todas') || can('caja.operar')) {
      const shift = await this.prisma.cashShift.findFirst({
        where: { tenantId, status: 'open', cashRegister: { warehouseId: { in: whIds } }, ...(can('caja.ver_todas') ? {} : { openedById: request.user.id }) },
        orderBy: { openedAt: 'desc' },
        include: { openedBy: { select: { name: true } }, cashRegister: { select: { name: true } } },
      });
      if (shift) {
        const [ventasEfectivo, movs] = await Promise.all([
          this.prisma.salePayment.aggregate({
            where: { tenantId, method: 'cash', sale: { shiftId: shift.id, status: 'confirmed' } },
            _sum: { amount: true },
          }),
          this.prisma.cashMovement.groupBy({ by: ['type'], where: { tenantId, shiftId: shift.id }, _sum: { amount: true } }),
        ]);
        const mov = (t: string) => Number(movs.find(m => m.type === t)?._sum.amount ?? 0);
        const efectivo =
          Number(shift.openingCash) + Number(ventasEfectivo._sum.amount ?? 0) + mov('deposit') - mov('withdrawal') - mov('expense');
        out.caja = {
          abierta: true,
          efectivo,
          desde: shift.openedAt.toISOString(),
          cajero: shift.openedBy.name,
          registro: shift.cashRegister.name,
        };
      } else {
        out.caja = { abierta: false, efectivo: null, desde: null, cajero: null, registro: null };
      }
    }

    // ---- Turnos abiertos ----
    if (can('caja.ver_todas')) {
      out.turnos = { abiertos: await this.prisma.cashShift.count({ where: { tenantId, status: 'open', cashRegister: { warehouseId: { in: whIds } } } }) };
    }

    // ---- Stock bajo mínimo (SUM(quantity) del ledger vs minStock) ----
    if (can('stock.ver')) {
      const conMin = await this.prisma.product.findMany({
        where: { tenantId, isActive: true, minStock: { not: null } },
        select: { id: true, name: true, minStock: true },
      });
      const sums = await this.prisma.stockMovement.groupBy({
        by: ['productId'],
        where: { tenantId, productId: { in: conMin.map(p => p.id) }, warehouseId: { in: whIds } },
        _sum: { quantity: true },
      });
      const stockOf = new Map(sums.map(s => [s.productId, Number(s._sum.quantity ?? 0)]));
      const bajos = conMin
        .map(p => ({ name: p.name, stock: stockOf.get(p.id) ?? 0, min: Number(p.minStock) }))
        .filter(p => p.stock < p.min)
        .sort((a, b) => a.stock / a.min - b.stock / b.min);
      out.stock = { bajoMinimo: bajos.length, ejemplos: bajos.slice(0, 3).map(p => p.name) };
      out.reposicion = { productos: bajos.length };
    }

    // ---- Vencimientos: lotes que vencen en ≤ 14 días ----
    if (can('stock.ver')) {
      const hoyDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const limite = new Date(hoyDate);
      limite.setDate(limite.getDate() + 14);
      const lotes = await this.prisma.productLot.findMany({
        where: { tenantId, warehouseId: { in: whIds }, expirationDate: { not: null, lte: limite, gte: hoyDate } },
        select: { expirationDate: true, product: { select: { name: true } } },
        orderBy: { expirationDate: 'asc' },
      });
      const dias = lotes.length
        ? Math.max(0, Math.round((lotes[0].expirationDate!.getTime() - hoyDate.getTime()) / 86400000))
        : null;
      out.vencimientos = { lotes: lotes.length, dias, ejemplos: lotes.slice(0, 3).map(l => l.product.name) };
    }

    // ---- Compras sin cargar (borradores) ----
    if (can('compras.ver')) {
      const drafts = await this.prisma.purchaseInvoice.findMany({
        where: { tenantId, status: 'draft', warehouseId: { in: whIds } },
        select: { supplier: { select: { name: true } } },
        take: 5,
      });
      out.compras = { sinCargar: drafts.length, proveedores: drafts.map(d => d.supplier.name) };
    }

    // ---- Proveedores ----
    if (can('proveedores.ver')) {
      out.proveedores = { activos: await this.prisma.supplier.count({ where: { tenantId, isActive: true } }) };
    }

    // ---- Productos ----
    if (can('productos.ver')) {
      const [activos, sinCategoria, sinPrecio] = await Promise.all([
        this.prisma.product.count({ where: { tenantId, isActive: true } }),
        this.prisma.product.count({ where: { tenantId, isActive: true, categoryId: null } }),
        this.prisma.product.count({ where: { tenantId, isActive: true, salePrice: null } }),
      ]);
      out.productos = { activos, sinCategoria, sinPrecio };
    }

    // ---- Precios: costo cargado pero sin precio de venta (lo accionable) ----
    if (can('precios.ver')) {
      out.precios = {
        pendientes: await this.prisma.product.count({
          where: { tenantId, isActive: true, costPrice: { not: null }, salePrice: null },
        }),
      };
    }

    // ---- Clientes + cuenta corriente ----
    if (can('clientes.ver')) {
      const conSaldo = await this.prisma.customer.findMany({
        where: { tenantId, isActive: true, accountBalance: { gt: 0 } },
        select: { accountBalance: true, creditLimit: true },
      });
      const enLaCalle = conSaldo.reduce((s, c) => s + Number(c.accountBalance), 0);
      const vencidos = conSaldo.filter(c => c.creditLimit != null && Number(c.accountBalance) > Number(c.creditLimit)).length;
      out.clientes = { total: await this.prisma.customer.count({ where: { tenantId, isActive: true } }) };
      out.cuentacorriente = { enLaCalle, vencidos };
    }

    return out;
  }
}
