import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { registrarMovimientoCuenta } from './cuenta-corriente.util';

type Usuario = { id: string; tenantId: string };

@Injectable()
export class CuentasCorrientesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async account(tenantId: string, customerId: string) {
    const cliente = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    const movimientos = await this.prisma.customerAccountMovement.findMany({
      where: { tenantId, customerId },
      orderBy: { occurredAt: 'desc' },
      take: 200,
      include: { user: { select: { name: true } } },
    });
    const creditLimit = cliente.creditLimit !== null ? Number(cliente.creditLimit) : null;
    const balance = Number(cliente.accountBalance);
    return {
      customerId,
      customerName: cliente.name,
      balance,
      creditLimit,
      available: creditLimit !== null ? Math.round((creditLimit - balance) * 100) / 100 : null,
      movements: movimientos.map(m => ({ ...m, userName: m.user.name, user: undefined })),
    };
  }

  async registerPayment(user: Usuario, customerId: string, body: Record<string, unknown>) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new UnprocessableEntityException('El monto debe ser mayor a cero');
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    return this.prisma.$transaction(tx =>
      registrarMovimientoCuenta(tx, user.tenantId, customerId, -amount, { type: 'payment', userId: user.id, notes }),
    );
  }

  async registerAdjustment(user: Usuario, customerId: string, body: Record<string, unknown>) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount === 0) throw new UnprocessableEntityException('El monto no puede ser cero');
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : '';
    if (!notes) throw new UnprocessableEntityException('Indicá el motivo del ajuste');
    return this.prisma.$transaction(tx =>
      registrarMovimientoCuenta(tx, user.tenantId, customerId, amount, { type: 'adjustment', userId: user.id, notes }),
    );
  }
}
