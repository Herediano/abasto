import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

type InstallmentInput = { installments?: unknown; surchargePercent?: unknown };

/**
 * Tarjetas de crédito guardadas: nombre + una tabla de recargo por cantidad
 * de cuotas (1 pago, 3 cuotas, 6…). El cajero elige una al cobrar en crédito
 * y el recargo ya está cargado — sin esto había que acordarse el % de cada
 * banco de memoria o dejarlo todo al % genérico de "Crédito" por sucursal.
 * Débito no usa esto: siempre es 1 pago, sin tabla de cuotas.
 */
@Injectable()
export class PaymentCardsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(tenantId: string, activeOnly: boolean) {
    return this.prisma.paymentCard.findMany({
      where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { name: 'asc' },
      include: { installmentOptions: { orderBy: { installments: 'asc' } } },
    });
  }

  private parseInstallments(raw: unknown): Array<{ installments: number; surchargePercent: number }> {
    if (!Array.isArray(raw) || !raw.length) throw new UnprocessableEntityException('Cargá al menos una opción de cuotas (1 pago cuenta como una)');
    const vistos = new Set<number>();
    return raw.map(item => {
      const row = item as InstallmentInput;
      const installments = Number(row.installments);
      if (!Number.isInteger(installments) || installments < 1) throw new UnprocessableEntityException('La cantidad de cuotas tiene que ser un entero mayor o igual a 1');
      if (vistos.has(installments)) throw new UnprocessableEntityException(`La cantidad de cuotas ${installments} está repetida`);
      vistos.add(installments);
      const surchargePercent = Number(row.surchargePercent);
      if (!Number.isFinite(surchargePercent)) throw new UnprocessableEntityException('El recargo tiene que ser un número');
      return { installments, surchargePercent };
    });
  }

  async create(tenantId: string, body: Record<string, unknown>) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new UnprocessableEntityException('El nombre es obligatorio');
    const opciones = this.parseInstallments(body.installmentOptions);
    return this.prisma.paymentCard.create({
      data: { tenantId, name, installmentOptions: { create: opciones } },
      include: { installmentOptions: { orderBy: { installments: 'asc' } } },
    });
  }

  async update(tenantId: string, id: string, body: Record<string, unknown>) {
    const actual = await this.prisma.paymentCard.findFirst({ where: { id, tenantId } });
    if (!actual) throw new NotFoundException('Tarjeta no encontrada');
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : actual.name;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : actual.isActive;
    // Reemplaza toda la tabla de cuotas de una: es chica (unas pocas filas) y
    // así no hay que resolver altas/bajas/ediciones línea por línea.
    const opciones = body.installmentOptions !== undefined ? this.parseInstallments(body.installmentOptions) : null;
    return this.prisma.$transaction(async tx => {
      if (opciones) {
        // Reemplaza la tabla entera: las cuotas usadas en ventas pasadas ya
        // quedaron guardadas en SalePayment.installments + surchargeAmount,
        // no dependen de que esta fila siga existiendo.
        await tx.paymentCardInstallment.deleteMany({ where: { tenantId, cardId: id } });
        await tx.paymentCardInstallment.createMany({ data: opciones.map(o => ({ tenantId, cardId: id, ...o })) });
      }
      return tx.paymentCard.update({
        where: { id }, data: { name, isActive },
        include: { installmentOptions: { orderBy: { installments: 'asc' } } },
      });
    });
  }
}
