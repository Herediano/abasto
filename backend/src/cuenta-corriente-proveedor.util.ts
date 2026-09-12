import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/**
 * Espejo de `registrarMovimientoCuenta` (cuenta-corriente.util.ts) del lado de
 * lo que nosotros le debemos a un proveedor, no lo que nos debe un cliente.
 * `amount` va firmado: positivo aumenta lo que le debemos (una factura o un
 * cargo), negativo lo reduce (un pago, o un descuento del proveedor).
 *
 * A diferencia del límite de crédito de un cliente, acá no hay tope que
 * validar: siempre se puede deber más.
 */
export async function registrarMovimientoCuentaProveedor(
  tx: Db,
  tenantId: string,
  supplierId: string,
  amount: number,
  opts: { type: 'invoice' | 'payment' | 'adjustment'; purchaseInvoiceId?: string | null; supplierNoteId?: string | null; userId: string; notes?: string | null },
) {
  const proveedor = await tx.supplier.findFirst({ where: { id: supplierId, tenantId } });
  if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
  const balanceAfter = Math.round((Number(proveedor.accountBalance) + amount) * 100) / 100;
  await tx.supplier.update({ where: { id: supplierId }, data: { accountBalance: balanceAfter } });
  return tx.supplierAccountMovement.create({
    data: {
      tenantId, supplierId, type: opts.type, amount, balanceAfter,
      purchaseInvoiceId: opts.purchaseInvoiceId ?? null, supplierNoteId: opts.supplierNoteId ?? null,
      userId: opts.userId, notes: opts.notes ?? null,
    },
  });
}
