import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { registrarMovimientoCuentaProveedor } from './cuenta-corriente-proveedor.util';

type Usuario = { id: string; tenantId: string };

@Injectable()
export class SuppliersAccountService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async account(tenantId: string, supplierId: string) {
    const proveedor = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    const movimientos = await this.prisma.supplierAccountMovement.findMany({
      where: { tenantId, supplierId },
      orderBy: { occurredAt: 'desc' },
      take: 200,
      include: {
        user: { select: { name: true } },
        purchaseInvoice: { select: { invoiceType: true, pointOfSale: true, invoiceNumber: true } },
        supplierNote: { select: { kind: true } },
      },
    });
    return {
      supplierId,
      supplierName: proveedor.name,
      balance: Number(proveedor.accountBalance),
      movements: movimientos.map(m => ({
        ...m,
        userName: m.user.name,
        user: undefined,
        comprobante: m.purchaseInvoice && m.purchaseInvoice.invoiceNumber
          ? `${m.purchaseInvoice.invoiceType} ${m.purchaseInvoice.pointOfSale}-${m.purchaseInvoice.invoiceNumber}`
          : null,
        purchaseInvoice: undefined,
        noteKind: m.supplierNote?.kind ?? null,
        supplierNote: undefined,
      })),
    };
  }

  async registerPayment(user: Usuario, supplierId: string, body: Record<string, unknown>) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new UnprocessableEntityException('El monto debe ser mayor a cero');
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    return this.prisma.$transaction(tx =>
      registrarMovimientoCuentaProveedor(tx, user.tenantId, supplierId, -amount, { type: 'payment', userId: user.id, notes }),
    );
  }

  async registerAdjustment(user: Usuario, supplierId: string, body: Record<string, unknown>) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount === 0) throw new UnprocessableEntityException('El monto no puede ser cero');
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : '';
    if (!notes) throw new UnprocessableEntityException('Indicá el motivo del ajuste');
    return this.prisma.$transaction(tx =>
      registrarMovimientoCuentaProveedor(tx, user.tenantId, supplierId, amount, { type: 'adjustment', userId: user.id, notes }),
    );
  }
}
