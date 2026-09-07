import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { registrarMovimientoCuenta } from './cuenta-corriente.util';

type Usuario = { id: string; tenantId: string; permissions: Set<string>; warehouseId?: string | null };

const r2 = (n: number) => Math.round(n * 100) / 100;
const REFUND_METHODS = ['cash', 'account'] as const;
const comprobante = (pos: string, n: number) => `${pos}-${String(n).padStart(8, '0')}`;

@Injectable()
export class CreditNotesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Cuánto de cada línea de una venta ya se devolvió en notas de crédito previas. */
  private async yaDevuelto(tenantId: string, saleId: string) {
    const filas = await this.prisma.creditNoteLine.groupBy({
      by: ['saleLineId'],
      where: { tenantId, creditNote: { saleId } },
      _sum: { quantity: true },
    });
    return new Map(filas.map(f => [f.saleLineId, Number(f._sum.quantity ?? 0)]));
  }

  async listForSale(tenantId: string, saleId: string) {
    const notas = await this.prisma.creditNote.findMany({
      where: { tenantId, saleId },
      orderBy: { occurredAt: 'desc' },
      include: { lines: true },
    });
    return notas.map(n => ({ ...n, comprobante: comprobante(n.pointOfSale, n.number) }));
  }

  async get(tenantId: string, id: string) {
    const nota = await this.prisma.creditNote.findFirst({ where: { id, tenantId }, include: { lines: true, sale: { select: { pointOfSale: true, number: true } } } });
    if (!nota) throw new NotFoundException('Nota de crédito no encontrada');
    return {
      ...nota,
      comprobante: comprobante(nota.pointOfSale, nota.number),
      saleComprobante: comprobante(nota.sale.pointOfSale, nota.sale.number),
    };
  }

  async list(tenantId: string, query: Record<string, string | undefined>, warehouseIds?: string[]) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20));
    const where: Prisma.CreditNoteWhereInput = {
      tenantId,
      ...(warehouseIds ? { warehouseId: { in: warehouseIds } } : {}),
      ...(query.from || query.to
        ? { occurredAt: { gte: query.from ? new Date(`${query.from}T00:00:00`) : undefined, lte: query.to ? new Date(`${query.to}T23:59:59.999`) : undefined } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.creditNote.findMany({ where, orderBy: { occurredAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { sale: { select: { pointOfSale: true, number: true } } } }),
      this.prisma.creditNote.count({ where }),
    ]);
    return {
      items: items.map(n => ({ ...n, comprobante: comprobante(n.pointOfSale, n.number), saleComprobante: comprobante(n.sale.pointOfSale, n.sale.number), sale: undefined })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Devolución total o parcial de una venta confirmada. Reingresa el stock de
   * cada línea devuelta (`adjustment_in`) y saca la plata: efectivo del turno
   * abierto, o crédito a la cuenta corriente del cliente. La venta original no
   * se toca.
   */
  async create(user: Usuario, saleId: string, body: Record<string, unknown>) {
    const tenantId = user.tenantId;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new UnprocessableEntityException('Indicá el motivo de la devolución');
    const refundMethod = String(body.refundMethod ?? '');
    if (!REFUND_METHODS.includes(refundMethod as (typeof REFUND_METHODS)[number])) {
      throw new UnprocessableEntityException('El reintegro tiene que ser en efectivo o a cuenta corriente');
    }
    const pedidas = Array.isArray(body.lines) ? body.lines : [];
    if (!pedidas.length) throw new UnprocessableEntityException('Elegí al menos un ítem para devolver');

    return this.prisma.$transaction(async tx => {
      const venta = await tx.sale.findFirst({ where: { id: saleId, tenantId }, include: { lines: true } });
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (venta.status !== 'confirmed') throw new ConflictException('Sólo se puede devolver una venta confirmada');

      if (refundMethod === 'account' && !venta.customerId) {
        throw new UnprocessableEntityException('Para reintegrar a cuenta corriente la venta tiene que ser de un cliente, no de consumidor final');
      }

      let turno: { id: string } | null = null;
      if (refundMethod === 'cash') {
        turno = await tx.cashShift.findFirst({ where: { tenantId, openedById: user.id, status: 'open' } });
        if (!turno) throw new UnprocessableEntityException('Abrí un turno de caja para poder devolver efectivo');
      }

      const devuelto = await this.yaDevuelto(tenantId, saleId);
      const porLinea = new Map(venta.lines.map(l => [l.id, l]));

      const lineas = pedidas.map(p => {
        const row = p as Record<string, unknown>;
        const saleLineId = String(row.saleLineId ?? '');
        const cantidad = Number(row.quantity);
        const linea = porLinea.get(saleLineId);
        if (!linea) throw new UnprocessableEntityException('Una de las líneas no pertenece a esta venta');
        if (!Number.isFinite(cantidad) || cantidad <= 0) throw new UnprocessableEntityException('La cantidad a devolver debe ser mayor a cero');
        const restante = Number(linea.quantity) - (devuelto.get(saleLineId) ?? 0);
        if (cantidad > restante + 1e-6) {
          throw new UnprocessableEntityException(`De "${linea.description}" quedan ${restante} sin devolver`);
        }
        // Proporcional: la línea original ya trae su descuento e IVA; se devuelve la misma fracción.
        const frac = cantidad / Number(linea.quantity);
        const lineSubtotal = r2(Number(linea.lineSubtotal) * frac);
        const lineTax = r2(Number(linea.lineTax) * frac);
        return {
          saleLineId,
          productId: linea.productId,
          productLotId: linea.productLotId,
          description: linea.description,
          quantity: cantidad,
          unitPrice: Number(linea.unitPrice),
          taxRate: Number(linea.taxRate),
          lineSubtotal,
          lineTax,
          lineTotal: r2(lineSubtotal + lineTax),
        };
      });

      const subtotal = r2(lineas.reduce((s, l) => s + l.lineSubtotal, 0));
      const taxTotal = r2(lineas.reduce((s, l) => s + l.lineTax, 0));
      const totalNc = r2(subtotal + taxTotal);
      if (totalNc <= 0) throw new UnprocessableEntityException('La devolución no tiene monto');

      // Numeración interna, mismo patrón atómico que las ventas.
      const pointOfSale = venta.pointOfSale;
      await tx.saleSequence.upsert({
        where: { tenantId_docType_pointOfSale: { tenantId, docType: 'credit_note', pointOfSale } },
        create: { tenantId, docType: 'credit_note', pointOfSale, lastNumber: 0 },
        update: {},
      });
      const [{ last_number: number }] = await tx.$queryRaw<Array<{ last_number: number }>>`
        UPDATE sale_sequences SET last_number = last_number + 1
        WHERE tenant_id = ${tenantId}::uuid AND doc_type = 'credit_note' AND point_of_sale = ${pointOfSale}
        RETURNING last_number
      `;

      const nota = await tx.creditNote.create({
        data: {
          tenantId, saleId, warehouseId: venta.warehouseId, customerId: venta.customerId, userId: user.id,
          shiftId: turno?.id ?? null, pointOfSale, number, reason, refundMethod, subtotal, taxTotal, total: totalNc,
        },
      });

      for (const l of lineas) {
        await tx.creditNoteLine.create({
          data: {
            tenantId, creditNoteId: nota.id, saleLineId: l.saleLineId, productId: l.productId, productLotId: l.productLotId,
            description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRate,
            lineSubtotal: l.lineSubtotal, lineTax: l.lineTax, lineTotal: l.lineTotal,
          },
        });
        // El stock devuelto reingresa al mismo depósito y lote de la venta.
        const lockKey = [tenantId, l.productId, l.productLotId ?? 'no-lot', venta.warehouseId].join(':');
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
        await tx.stockMovement.create({
          data: {
            tenantId, productId: l.productId, productLotId: l.productLotId, warehouseId: venta.warehouseId,
            quantity: new Prisma.Decimal(l.quantity), movementType: 'adjustment_in',
            referenceType: 'credit_note', referenceId: nota.id,
            notes: `Nota de crédito ${comprobante(pointOfSale, number)} sobre venta ${comprobante(venta.pointOfSale, venta.number)}: ${reason}`,
          },
        });
      }

      if (refundMethod === 'account') {
        await registrarMovimientoCuenta(tx, tenantId, venta.customerId!, -totalNc, {
          type: 'adjustment', saleId, userId: user.id,
          notes: `Nota de crédito ${comprobante(pointOfSale, number)}: ${reason}`,
        });
      } else {
        await tx.cashMovement.create({
          data: {
            tenantId, shiftId: turno!.id, userId: user.id, type: 'expense',
            amount: new Prisma.Decimal(totalNc), reason: `Devolución NC ${comprobante(pointOfSale, number)}: ${reason}`,
          },
        });
      }

      return { ...nota, comprobante: comprobante(pointOfSale, number) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
