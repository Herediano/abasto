import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, PurchaseInvoiceStatus, SupplierNoteKind } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { registrarMovimientoCuentaProveedor } from './cuenta-corriente-proveedor.util';

type Usuario = { id: string; tenantId: string };

// Las mismas que puede corregir/anular una factura de compra (ver
// purchases.service.ts): si ya generó deuda y stock reales, se le puede
// aplicar una NC/ND. Un draft no generó nada todavía; una cancelled ya se
// revirtió entera.
const NOTEABLE_STATUSES: PurchaseInvoiceStatus[] = [PurchaseInvoiceStatus.confirmed, PurchaseInvoiceStatus.corrected, PurchaseInvoiceStatus.received];
const KINDS: SupplierNoteKind[] = [SupplierNoteKind.credit_note, SupplierNoteKind.debit_note];

const r2 = (n: number) => Math.round(n * 100) / 100;

type LineInput = {
  purchaseInvoiceId: string;
  purchaseInvoiceLineId?: string;
  returnsStock: boolean;
  quantity?: number;
  unitAmount?: number;
  amount?: number;
  taxRate?: number;
  description?: string;
};

@Injectable()
export class SupplierNotesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private num(value: unknown, field: string): number {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new UnprocessableEntityException(`${field} no es un número válido`);
    return n;
  }

  private comprobanteFactura(f: { invoiceType: string; pointOfSale: string | null; invoiceNumber: string | null }) {
    return f.invoiceNumber ? `${f.invoiceType} ${f.pointOfSale}-${f.invoiceNumber}` : 'Remito (factura pendiente)';
  }

  private map(note: Prisma.SupplierNoteGetPayload<{ include: { lines: true; user: { select: { name: true } } } }>) {
    return {
      ...note,
      userName: note.user.name,
      user: undefined,
      supplierComprobante:
        note.supplierPointOfSale && note.supplierNumber ? `${note.supplierDocType ?? ''} ${note.supplierPointOfSale}-${note.supplierNumber}`.trim() : null,
    };
  }

  async listForSupplier(tenantId: string, supplierId: string) {
    const notas = await this.prisma.supplierNote.findMany({
      where: { tenantId, supplierId },
      orderBy: { occurredAt: 'desc' },
      include: { lines: true, user: { select: { name: true } } },
    });
    return notas.map(n => this.map(n));
  }

  async listForInvoice(tenantId: string, invoiceId: string) {
    const notas = await this.prisma.supplierNote.findMany({
      where: { tenantId, lines: { some: { purchaseInvoiceId: invoiceId } } },
      orderBy: { occurredAt: 'desc' },
      include: { lines: true, user: { select: { name: true } } },
    });
    return notas.map(n => this.map(n));
  }

  /**
   * Facturas de este proveedor elegibles para una NC/ND, para el selector del
   * diálogo. A propósito sin filtrar por sucursal activa: la cuenta corriente
   * de un proveedor es de toda la empresa (`Supplier.accountBalance` no es
   * por sucursal), así que hay que poder acreditar una factura recibida en
   * Casa Central aunque ahora mismo estés parado en Sucursal Norte.
   */
  async notableInvoices(tenantId: string, supplierId: string) {
    return this.prisma.purchaseInvoice.findMany({
      where: { tenantId, supplierId, status: { in: NOTEABLE_STATUSES } },
      orderBy: { issueDate: 'desc' },
      include: { lines: true },
    });
  }

  async get(tenantId: string, id: string) {
    const nota = await this.prisma.supplierNote.findFirst({
      where: { id, tenantId },
      include: { lines: true, user: { select: { name: true } } },
    });
    if (!nota) throw new NotFoundException('Nota no encontrada');
    return this.map(nota);
  }

  /**
   * Cuánto de una línea de factura ya se acreditó (devuelto físicamente) en
   * notas previas. Corre dentro de la misma transacción que la crea (`tx`),
   * no con `this.prisma`: si no, dos notas contra la misma línea casi
   * simultáneas podrían no verse una a la otra y pasarse del tope.
   */
  private async yaAcreditado(tx: Prisma.TransactionClient, tenantId: string, purchaseInvoiceLineId: string) {
    const r = await tx.supplierNoteLine.aggregate({
      where: { tenantId, purchaseInvoiceLineId, returnsStock: true, note: { kind: SupplierNoteKind.credit_note } },
      _sum: { quantity: true },
    });
    return Number(r._sum.quantity ?? 0);
  }

  /**
   * Nota de crédito o débito de proveedor, estructurada y trazable línea por
   * línea contra una o varias facturas confirmadas del mismo proveedor — a
   * diferencia del "ajuste" suelto de la cuenta corriente (sólo un monto y un
   * texto). Cada línea es independiente: puede devolver stock (resta si es NC,
   * suma si es ND) o ser un ajuste puramente financiero (precio, flete,
   * bonificación) que no toca el depósito.
   */
  async create(user: Usuario, supplierId: string, body: Record<string, unknown>) {
    const tenantId = user.tenantId;
    const kind = body.kind as SupplierNoteKind;
    if (!KINDS.includes(kind)) throw new UnprocessableEntityException('kind tiene que ser credit_note o debit_note');
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new UnprocessableEntityException('Indicá el motivo de la nota');
    const rawLines = Array.isArray(body.lines) ? (body.lines as LineInput[]) : [];
    if (!rawLines.length) throw new UnprocessableEntityException('Agregá al menos una línea');

    const supplierDocType = typeof body.supplierDocType === 'string' && body.supplierDocType.trim() ? body.supplierDocType.trim() : null;
    const supplierPointOfSale = typeof body.supplierPointOfSale === 'string' && body.supplierPointOfSale.trim() ? body.supplierPointOfSale.trim() : null;
    const supplierNumber = typeof body.supplierNumber === 'string' && body.supplierNumber.trim() ? body.supplierNumber.trim() : null;
    const supplierIssueDate = body.supplierIssueDate ? new Date(String(body.supplierIssueDate)) : null;
    if (supplierIssueDate && Number.isNaN(supplierIssueDate.getTime())) throw new UnprocessableEntityException('La fecha del comprobante del proveedor no es válida');

    return this.prisma.$transaction(async tx => {
      const supplier = await tx.supplier.findFirst({ where: { id: supplierId, tenantId, isActive: true } });
      if (!supplier) throw new NotFoundException('Proveedor no encontrado');

      const invoiceCache = new Map<string, Prisma.PurchaseInvoiceGetPayload<{ include: { lines: true } }>>();
      const lineasParaCrear: Array<{
        purchaseInvoiceId: string; purchaseInvoiceLineId: string | null; productId: string | null; productLotId: string | null;
        description: string; returnsStock: boolean; quantity: number | null; unitAmount: number | null;
        taxRate: number; lineSubtotal: number; lineTax: number; lineTotal: number; warehouseId: string;
      }> = [];

      for (const raw of rawLines) {
        const purchaseInvoiceId = typeof raw.purchaseInvoiceId === 'string' ? raw.purchaseInvoiceId : '';
        if (!purchaseInvoiceId) throw new UnprocessableEntityException('Cada línea tiene que indicar de qué factura viene');
        let invoice = invoiceCache.get(purchaseInvoiceId);
        if (!invoice) {
          const found = await tx.purchaseInvoice.findFirst({ where: { id: purchaseInvoiceId, tenantId, supplierId }, include: { lines: true } });
          if (!found) throw new NotFoundException('Una de las facturas no corresponde a este proveedor');
          if (!NOTEABLE_STATUSES.includes(found.status)) throw new ConflictException('Sólo se pueden acreditar facturas confirmadas');
          invoiceCache.set(purchaseInvoiceId, found);
          invoice = found;
        }

        const returnsStock = raw.returnsStock === true;
        let purchaseInvoiceLine: (typeof invoice.lines)[number] | undefined;
        if (raw.purchaseInvoiceLineId) {
          purchaseInvoiceLine = invoice.lines.find(l => l.id === raw.purchaseInvoiceLineId);
          if (!purchaseInvoiceLine) throw new UnprocessableEntityException('Una de las líneas no corresponde a esa factura');
        }
        if (returnsStock && !purchaseInvoiceLine) throw new UnprocessableEntityException('Para devolver stock, la línea tiene que apuntar a un producto puntual de la factura');

        let quantity: number | null = null;
        let unitAmount: number | null = null;
        let lineSubtotal: number;
        const taxRate = raw.taxRate !== undefined ? this.num(raw.taxRate, 'taxRate') : Number(purchaseInvoiceLine?.taxRate ?? 0);

        if (raw.quantity !== undefined && raw.unitAmount !== undefined) {
          quantity = this.num(raw.quantity, 'quantity');
          unitAmount = this.num(raw.unitAmount, 'unitAmount');
          if (quantity <= 0) throw new UnprocessableEntityException('La cantidad tiene que ser mayor a cero');
          lineSubtotal = r2(quantity * unitAmount);
        } else if (raw.amount !== undefined) {
          lineSubtotal = r2(this.num(raw.amount, 'amount'));
        } else {
          throw new UnprocessableEntityException('Cada línea necesita cantidad y precio unitario, o un monto directo');
        }
        if (lineSubtotal <= 0) throw new UnprocessableEntityException('El monto de la línea tiene que ser mayor a cero');

        if (returnsStock) {
          if (quantity === null) throw new UnprocessableEntityException('Para devolver stock hace falta indicar la cantidad');
          // El tope físico sólo aplica a la NC (nosotros devolviendo mercadería):
          // no se puede devolver más de lo que se compró en esa línea, neto de lo
          // ya devuelto en notas anteriores. La ND (nos mandaron de más) no tiene
          // ese techo — es stock entrando, no saliendo.
          if (kind === SupplierNoteKind.credit_note) {
            const acreditado = await this.yaAcreditado(tx, tenantId, purchaseInvoiceLine!.id);
            const restante = Number(purchaseInvoiceLine!.quantity) - acreditado;
            if (quantity > restante + 1e-6) {
              throw new UnprocessableEntityException(`De "${purchaseInvoiceLine!.description}" quedan ${restante} sin acreditar en esta factura`);
            }
          }
        }

        const lineTax = r2(lineSubtotal * taxRate / 100);
        lineasParaCrear.push({
          purchaseInvoiceId,
          purchaseInvoiceLineId: purchaseInvoiceLine?.id ?? null,
          productId: purchaseInvoiceLine?.productId ?? null,
          productLotId: purchaseInvoiceLine?.productLotId ?? null,
          description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : (purchaseInvoiceLine?.description ?? `Ajuste sobre ${this.comprobanteFactura(invoice)}`),
          returnsStock, quantity, unitAmount, taxRate, lineSubtotal, lineTax, lineTotal: r2(lineSubtotal + lineTax),
          warehouseId: invoice.warehouseId,
        });
      }

      const subtotal = r2(lineasParaCrear.reduce((s, l) => s + l.lineSubtotal, 0));
      const taxTotal = r2(lineasParaCrear.reduce((s, l) => s + l.lineTax, 0));
      const total = r2(subtotal + taxTotal);

      const nota = await tx.supplierNote.create({
        data: {
          tenantId, supplierId, kind, reason, supplierDocType, supplierPointOfSale, supplierNumber, supplierIssueDate,
          subtotal, taxTotal, total, userId: user.id,
        },
      });

      for (const l of lineasParaCrear) {
        await tx.supplierNoteLine.create({
          data: {
            tenantId, noteId: nota.id, purchaseInvoiceId: l.purchaseInvoiceId, purchaseInvoiceLineId: l.purchaseInvoiceLineId,
            productId: l.productId, productLotId: l.productLotId, description: l.description, returnsStock: l.returnsStock,
            quantity: l.quantity, unitAmount: l.unitAmount, taxRate: l.taxRate, lineSubtotal: l.lineSubtotal, lineTax: l.lineTax, lineTotal: l.lineTotal,
          },
        });

        if (l.returnsStock) {
          const lockKey = [tenantId, l.productId, l.productLotId ?? 'no-lot', l.warehouseId].join(':');
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
          const notes = `${kind === SupplierNoteKind.credit_note ? 'Nota de crédito' : 'Nota de débito'} a ${supplier.name}: ${reason}`;
          if (kind === SupplierNoteKind.credit_note) {
            const current = await tx.stockMovement.aggregate({
              where: { tenantId, productId: l.productId!, productLotId: l.productLotId, warehouseId: l.warehouseId },
              _sum: { quantity: true },
            });
            const available = Number(current._sum.quantity ?? 0);
            if (available < l.quantity!) {
              throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: 'No hay stock suficiente para devolver esta cantidad', available: available.toFixed(3), requested: l.quantity!.toFixed(3) });
            }
            await tx.stockMovement.create({ data: { tenantId, productId: l.productId!, productLotId: l.productLotId, warehouseId: l.warehouseId, quantity: new Prisma.Decimal(l.quantity!).negated(), movementType: 'adjustment_out', referenceType: 'supplier_note', referenceId: nota.id, notes } });
          } else {
            await tx.stockMovement.create({ data: { tenantId, productId: l.productId!, productLotId: l.productLotId, warehouseId: l.warehouseId, quantity: new Prisma.Decimal(l.quantity!), movementType: 'adjustment_in', referenceType: 'supplier_note', referenceId: nota.id, notes } });
          }
        }
      }

      await registrarMovimientoCuentaProveedor(tx, tenantId, supplierId, kind === SupplierNoteKind.credit_note ? -total : total, {
        type: 'adjustment', supplierNoteId: nota.id, userId: user.id,
        notes: `${kind === SupplierNoteKind.credit_note ? 'Nota de crédito' : 'Nota de débito'}: ${reason}`,
      });

      const completa = await tx.supplierNote.findFirst({ where: { id: nota.id, tenantId }, include: { lines: true, user: { select: { name: true } } } });
      return this.map(completa!);
      // Puede tocar varias facturas con varias líneas cada una — más trabajo
      // secuencial que una corrección de una sola factura. 15s en vez de los
      // 5s por defecto para no cortarla a mitad en un lote grande.
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  }
}
