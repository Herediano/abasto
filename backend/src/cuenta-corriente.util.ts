import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

/**
 * Registra un movimiento de cuenta corriente y actualiza el saldo cacheado del
 * cliente en la misma transacción (misma filosofía que Product.salePrice: el
 * saldo real es la suma de CustomerAccountMovement, esto es cache). amount va
 * firmado: positivo aumenta la deuda (una venta a cuenta corriente), negativo
 * la reduce (un cobro).
 *
 * El límite de crédito sólo se valida para 'sale': un ajuste o un cobro nunca
 * lo exceden por definición, y un ajuste manual es una corrección que puede
 * necesitar pasarlo a propósito.
 */
export async function registrarMovimientoCuenta(
  tx: Db,
  tenantId: string,
  customerId: string,
  amount: number,
  opts: { type: 'sale' | 'payment' | 'adjustment'; saleId?: string | null; userId: string; notes?: string | null },
) {
  const cliente = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!cliente) throw new NotFoundException('Cliente no encontrado');
  const balanceAfter = Math.round((Number(cliente.accountBalance) + amount) * 100) / 100;
  if (opts.type === 'sale' && cliente.creditLimit !== null && balanceAfter > Number(cliente.creditLimit)) {
    const disponible = Math.round((Number(cliente.creditLimit) - Number(cliente.accountBalance)) * 100) / 100;
    throw new UnprocessableEntityException(`${cliente.name} no tiene crédito disponible suficiente en su cuenta corriente (disponible: ${disponible.toFixed(2)})`);
  }
  await tx.customer.update({ where: { id: customerId }, data: { accountBalance: balanceAfter } });
  return tx.customerAccountMovement.create({
    data: { tenantId, customerId, type: opts.type, amount, balanceAfter, saleId: opts.saleId ?? null, userId: opts.userId, notes: opts.notes ?? null },
  });
}
