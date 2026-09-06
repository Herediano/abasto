import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

type Usuario = { id: string; tenantId: string; permissions: Set<string>; warehouseId?: string | null };

const TIPOS_MOVIMIENTO = ['deposit', 'withdrawal', 'expense'] as const;

function texto(v: unknown) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function monto(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Caja: registros físicos de cobro, turnos y arqueo. Un turno abierto es lo
 * que le da sentido a todo lo demás — movimientos de efectivo y ventas se
 * cuelgan de él — y sólo puede haber uno por caja y uno por usuario a la vez
 * (los índices únicos parciales de la migración son la garantía real; los
 * chequeos de acá son para devolver un mensaje legible antes de pegar contra
 * eso).
 */
@Injectable()
export class CajaService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listRegisters(tenantId: string, warehouseIds?: string[], warehouseId?: string) {
    return this.prisma.cashRegister.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(warehouseIds ? { warehouseId: { in: warehouseIds } } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRegister(tenantId: string, body: Record<string, unknown>) {
    const name = texto(body.name);
    const warehouseId = texto(body.warehouseId);
    if (!name || !warehouseId) throw new BadRequestException('name y warehouseId son obligatorios');
    if (!(await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } }))) throw new BadRequestException('Depósito no encontrado');
    try {
      return await this.prisma.cashRegister.create({ data: { tenantId, warehouseId, name } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una caja con ese nombre en esa sucursal');
      throw error;
    }
  }

  /** El turno abierto del usuario que llama, si tiene uno. Es lo primero que consulta la pantalla de caja al entrar. */
  async current(user: Usuario) {
    const turno = await this.prisma.cashShift.findFirst({ where: { tenantId: user.tenantId, openedById: user.id, status: 'open' } });
    return turno ? this.detail(user, turno.id) : null;
  }

  async open(user: Usuario, body: Record<string, unknown>) {
    const cashRegisterId = texto(body.cashRegisterId);
    if (!cashRegisterId) throw new UnprocessableEntityException('Elegí una caja para abrir el turno');
    const openingCash = monto(body.openingCash);
    if (!Number.isFinite(openingCash) || openingCash < 0) throw new UnprocessableEntityException('El fondo inicial no puede ser negativo');
    const registro = await this.prisma.cashRegister.findFirst({ where: { id: cashRegisterId, tenantId: user.tenantId, isActive: true } });
    if (!registro) throw new NotFoundException('Caja no encontrada');
    let creado: { id: string };
    try {
      creado = await this.prisma.cashShift.create({
        data: { tenantId: user.tenantId, cashRegisterId, openedById: user.id, openingCash, openingNotes: texto(body.openingNotes) },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya hay un turno abierto en esa caja, o ya tenés un turno abierto en otra');
      }
      throw error;
    }
    return this.detail(user, creado.id);
  }

  private async turnoDeUsuario(user: Usuario, shiftId: string) {
    const turno = await this.prisma.cashShift.findFirst({ where: { id: shiftId, tenantId: user.tenantId } });
    if (!turno) throw new NotFoundException('Turno no encontrado');
    if (!user.permissions.has('caja.ver_todas') && turno.openedById !== user.id) throw new NotFoundException('Turno no encontrado');
    return turno;
  }

  async addMovement(user: Usuario, shiftId: string, body: Record<string, unknown>) {
    const turno = await this.turnoDeUsuario(user, shiftId);
    if (turno.status !== 'open') throw new ConflictException('El turno ya está cerrado');
    const type = typeof body.type === 'string' ? body.type : '';
    if (!TIPOS_MOVIMIENTO.includes(type as (typeof TIPOS_MOVIMIENTO)[number])) throw new UnprocessableEntityException(`El tipo debe ser uno de: ${TIPOS_MOVIMIENTO.join(', ')}`);
    const amount = monto(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new UnprocessableEntityException('El monto debe ser mayor a cero');
    const reason = texto(body.reason);
    if (!reason) throw new UnprocessableEntityException('Indicá el motivo del movimiento');
    return this.prisma.cashMovement.create({
      data: { tenantId: user.tenantId, shiftId, userId: user.id, type: type as (typeof TIPOS_MOVIMIENTO)[number], amount, reason },
    });
  }

  /** Total esperado en el cajón: fondo inicial + ventas en efectivo + ingresos − retiros − gastos. */
  private async efectivoEsperado(tx: Prisma.TransactionClient, tenantId: string, turno: { id: string; openingCash: Prisma.Decimal }) {
    const [ventasEfectivo, movimientos] = await Promise.all([
      tx.salePayment.aggregate({
        where: { tenantId, method: 'cash', sale: { shiftId: turno.id, status: 'confirmed' } },
        _sum: { amount: true },
      }),
      tx.cashMovement.groupBy({ by: ['type'], where: { tenantId, shiftId: turno.id }, _sum: { amount: true } }),
    ]);
    const porTipo = Object.fromEntries(movimientos.map(m => [m.type, Number(m._sum.amount ?? 0)]));
    return (
      Number(turno.openingCash) +
      Number(ventasEfectivo._sum.amount ?? 0) +
      (porTipo.deposit ?? 0) -
      (porTipo.withdrawal ?? 0) -
      (porTipo.expense ?? 0)
    );
  }

  /** Detalle de un turno: movimientos, y —si ya cerró o se pide para cerrar— el desglose de ventas por medio de pago. */
  async detail(user: Usuario, shiftId: string) {
    const turno = await this.turnoDeUsuario(user, shiftId);
    const [movimientos, porMedio, cantidadVentas, openedBy, closedBy, cashRegister] = await Promise.all([
      this.prisma.cashMovement.findMany({ where: { tenantId: user.tenantId, shiftId }, orderBy: { occurredAt: 'asc' }, include: { user: { select: { name: true } } } }),
      this.prisma.salePayment.groupBy({ by: ['method'], where: { tenantId: user.tenantId, sale: { shiftId, status: 'confirmed' } }, _sum: { amount: true } }),
      this.prisma.sale.count({ where: { tenantId: user.tenantId, shiftId, status: 'confirmed' } }),
      this.prisma.user.findUnique({ where: { id: turno.openedById }, select: { name: true } }),
      turno.closedById ? this.prisma.user.findUnique({ where: { id: turno.closedById }, select: { name: true } }) : Promise.resolve(null),
      this.prisma.cashRegister.findUnique({ where: { id: turno.cashRegisterId }, select: { id: true, name: true, warehouseId: true } }),
    ]);
    return {
      ...turno,
      cashRegister,
      openedByName: openedBy?.name ?? '',
      closedByName: closedBy?.name ?? null,
      salesCount: cantidadVentas,
      totalsByMethod: porMedio.map(p => ({ method: p.method, total: Number(p._sum.amount ?? 0) })),
      movements: movimientos.map(m => ({ ...m, userName: m.user.name, user: undefined })),
    };
  }

  async close(user: Usuario, shiftId: string, body: Record<string, unknown>) {
    await this.prisma.$transaction(async tx => {
      const turno = await tx.cashShift.findFirst({ where: { id: shiftId, tenantId: user.tenantId } });
      if (!turno) throw new NotFoundException('Turno no encontrado');
      if (!user.permissions.has('caja.ver_todas') && turno.openedById !== user.id) throw new NotFoundException('Turno no encontrado');
      if (turno.status === 'closed') throw new ConflictException('El turno ya está cerrado');
      const countedCash = monto(body.countedCash);
      if (!Number.isFinite(countedCash) || countedCash < 0) throw new UnprocessableEntityException('Contá el efectivo del cajón antes de cerrar');

      const expectedCash = await this.efectivoEsperado(tx, user.tenantId, turno);
      const cashDifference = Math.round((countedCash - expectedCash) * 100) / 100;

      await tx.cashShift.update({
        where: { id: shiftId },
        data: {
          status: 'closed', closedById: user.id, closedAt: new Date(),
          expectedCash, countedCash, cashDifference, closingNotes: texto(body.closingNotes),
        },
      });
    });
    // Fuera de la transacción: detail() lee con this.prisma (otra conexión),
    // así que tiene que correr después de que el cierre ya haya confirmado.
    return this.detail(user, shiftId);
  }

  /** Historial de turnos: para el supervisor, todas las cajas de la sucursal activa; filtra por caja/estado/fecha. */
  async list(tenantId: string, query: Record<string, string | undefined>, warehouseIds?: string[]) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20));
    const where: Prisma.CashShiftWhereInput = {
      tenantId,
      ...(warehouseIds ? { cashRegister: { warehouseId: { in: warehouseIds } } } : {}),
      ...(query.cashRegisterId ? { cashRegisterId: query.cashRegisterId } : {}),
      ...(query.status ? { status: query.status as 'open' | 'closed' } : {}),
      ...(query.from || query.to
        ? { openedAt: { gte: query.from ? new Date(`${query.from}T00:00:00`) : undefined, lte: query.to ? new Date(`${query.to}T23:59:59.999`) : undefined } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.cashShift.findMany({
        where, orderBy: { openedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        include: { cashRegister: { select: { name: true } }, openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
      }),
      this.prisma.cashShift.count({ where }),
    ]);
    return {
      items: items.map(s => ({ ...s, cashRegisterName: s.cashRegister.name, openedByName: s.openedBy.name, closedByName: s.closedBy?.name ?? null, cashRegister: undefined, openedBy: undefined, closedBy: undefined })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
