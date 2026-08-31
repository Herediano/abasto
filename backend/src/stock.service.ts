import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { IN_MOVEMENT_TYPES, OUT_MOVEMENT_TYPES, MovementInput } from './stock.types';

type Scope = { tenantId: string; productId: string; productLotId?: string; warehouseId: string };

@Injectable()
export class StockService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private parseInput(body: MovementInput, allowed: readonly MovementType[]) {
    const required = ['productId', 'warehouseId', 'quantity', 'movementType'];
    for (const field of required) {
      if (typeof body[field as keyof MovementInput] !== 'string' && field !== 'quantity') {
        throw new UnprocessableEntityException(`${field} es obligatorio`);
      }
    }
    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new UnprocessableEntityException('quantity debe ser mayor a cero');
    if (typeof body.movementType !== 'string' || !allowed.includes(body.movementType as MovementType)) {
      throw new UnprocessableEntityException('movementType no es válido para esta operación');
    }
    if (body.operationId !== undefined && typeof body.operationId !== 'string') throw new UnprocessableEntityException('operationId debe ser UUID');
    if (body.movementType === MovementType.transfer_in || body.movementType === MovementType.transfer_out) {
      if (typeof body.operationId !== 'string' || !body.operationId.trim()) throw new UnprocessableEntityException('operationId es obligatorio para transferencias');
    }
    return {
      productId: body.productId as string,
      productLotId: typeof body.productLotId === 'string' ? body.productLotId : undefined,
      warehouseId: body.warehouseId as string,
      quantity,
      movementType: body.movementType as MovementType,
      operationId: typeof body.operationId === 'string' ? body.operationId : undefined,
      occurredAt: body.occurredAt === undefined ? undefined : new Date(String(body.occurredAt)),
      referenceType: typeof body.referenceType === 'string' ? body.referenceType : undefined,
      referenceId: typeof body.referenceId === 'string' ? body.referenceId : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    };
  }

  private async validateScope(tx: Prisma.TransactionClient, scope: Scope) {
    const product = await tx.product.findFirst({ where: { id: scope.productId, tenantId: scope.tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const warehouse = await tx.warehouse.findFirst({ where: { id: scope.warehouseId, tenantId: scope.tenantId } });
    if (!warehouse) throw new NotFoundException('Depósito no encontrado');
    if (product.manejaVencimiento && !scope.productLotId) throw new UnprocessableEntityException('productLotId es obligatorio para este producto');
    if (scope.productLotId) {
      const lot = await tx.productLot.findFirst({ where: { id: scope.productLotId, tenantId: scope.tenantId, productId: scope.productId } });
      if (!lot) throw new UnprocessableEntityException('El lote no corresponde al producto o tenant');
    }
  }

  async createIn(tenantId: string, body: MovementInput) {
    const input = this.parseInput(body, IN_MOVEMENT_TYPES);
    return this.prisma.$transaction(async tx => {
      const scope = { tenantId, productId: input.productId, productLotId: input.productLotId, warehouseId: input.warehouseId };
      await this.validateScope(tx, scope);
      return tx.stockMovement.create({ data: {
        tenantId, productId: input.productId, productLotId: input.productLotId, warehouseId: input.warehouseId,
        quantity: new Prisma.Decimal(input.quantity), movementType: input.movementType, operationId: input.operationId,
        occurredAt: input.occurredAt, referenceType: input.referenceType, referenceId: input.referenceId, notes: input.notes,
      } });
    });
  }

  async createOut(tenantId: string, body: MovementInput) {
    const input = this.parseInput(body, OUT_MOVEMENT_TYPES);
    return this.prisma.$transaction(async tx => {
      const scope = { tenantId, productId: input.productId, productLotId: input.productLotId, warehouseId: input.warehouseId };
      await this.validateScope(tx, scope);
      const lockKey = [tenantId, input.productId, input.productLotId ?? 'no-lot', input.warehouseId].join(':');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      const current = await tx.stockMovement.aggregate({ where: { tenantId, productId: input.productId, productLotId: input.productLotId ?? null, warehouseId: input.warehouseId }, _sum: { quantity: true } });
      const available = Number(current._sum.quantity ?? 0);
      if (available < input.quantity) throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: 'Stock insuficiente para realizar el egreso', available: available.toFixed(3), requested: input.quantity.toFixed(3), productId: input.productId, productLotId: input.productLotId ?? null, warehouseId: input.warehouseId });
      return tx.stockMovement.create({ data: {
        tenantId, productId: input.productId, productLotId: input.productLotId, warehouseId: input.warehouseId,
        quantity: new Prisma.Decimal(input.quantity).negated(), movementType: input.movementType, operationId: input.operationId,
        occurredAt: input.occurredAt, referenceType: input.referenceType, referenceId: input.referenceId, notes: input.notes,
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async current(tenantId: string, productId: string, warehouseId?: string, productLotId?: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const rows = await this.prisma.$queryRaw<Array<{ warehouseId: string; warehouseName: string; productLotId: string | null; lotNumber: string | null; expirationDate: Date | null; quantity: Prisma.Decimal }>>`
      SELECT sm.warehouse_id AS "warehouseId", w.name AS "warehouseName", sm.product_lot_id AS "productLotId",
        pl.lot_number AS "lotNumber", pl.expiration_date AS "expirationDate", SUM(sm.quantity) AS quantity
      FROM stock_movements sm JOIN warehouses w ON w.id = sm.warehouse_id AND w.tenant_id = sm.tenant_id
      LEFT JOIN product_lots pl ON pl.id = sm.product_lot_id AND pl.tenant_id = sm.tenant_id
      WHERE sm.tenant_id = ${tenantId}::uuid AND sm.product_id = ${productId}::uuid
        ${warehouseId ? Prisma.sql`AND sm.warehouse_id = ${warehouseId}::uuid` : Prisma.empty}
        ${productLotId ? Prisma.sql`AND sm.product_lot_id = ${productLotId}::uuid` : Prisma.empty}
      GROUP BY sm.warehouse_id, w.name, sm.product_lot_id, pl.lot_number, pl.expiration_date
      HAVING SUM(sm.quantity) <> 0 ORDER BY w.name, pl.lot_number
    `;
    return { productId, items: rows.map(row => ({ ...row, quantity: row.quantity.toFixed(3) })) };
  }

  async history(tenantId: string, productId: string, query: Record<string, string | undefined>) {
    if (!(await this.prisma.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } }))) throw new NotFoundException('Producto no encontrado');
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20));
    const where: Prisma.StockMovementWhereInput = { tenantId, productId, warehouseId: query.warehouseId, productLotId: query.productLotId, movementType: query.movementType as MovementType | undefined };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({ where, include: { productLot: { select: { lotNumber: true } }, warehouse: { select: { name: true } } }, orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return { items: items.map(item => ({ ...item, lotNumber: item.productLot?.lotNumber ?? null, warehouseName: item.warehouse.name, productLot: undefined, warehouse: undefined })), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }
}
