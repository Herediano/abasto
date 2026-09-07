import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
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

  /**
   * Mueve mercadería de un depósito a otro (típicamente entre sucursales) en una
   * sola transacción: `transfer_out` en el origen (con lock y chequeo de
   * disponible, como cualquier egreso) y `transfer_in` en el destino, ambos con
   * el mismo `operationId` para poder aparearlos después. El libro sigue siendo
   * append-only: la transferencia son dos asientos, no una edición.
   */
  async transfer(tenantId: string, body: Record<string, unknown>) {
    const productId = typeof body.productId === 'string' ? body.productId : '';
    const fromWarehouseId = typeof body.fromWarehouseId === 'string' ? body.fromWarehouseId : '';
    const toWarehouseId = typeof body.toWarehouseId === 'string' ? body.toWarehouseId : '';
    const productLotId = typeof body.productLotId === 'string' && body.productLotId ? body.productLotId : undefined;
    const quantity = Number(body.quantity);
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined;
    if (!productId || !fromWarehouseId || !toWarehouseId) throw new UnprocessableEntityException('Indicá el producto, el depósito de origen y el de destino');
    if (fromWarehouseId === toWarehouseId) throw new BadRequestException('El origen y el destino tienen que ser distintos');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new UnprocessableEntityException('La cantidad debe ser mayor a cero');

    const operationId = randomUUID();
    const qty = new Prisma.Decimal(quantity);

    return this.prisma.$transaction(async tx => {
      await this.validateScope(tx, { tenantId, productId, productLotId, warehouseId: fromWarehouseId });
      const destino = await tx.warehouse.findFirst({ where: { id: toWarehouseId, tenantId } });
      if (!destino) throw new NotFoundException('Depósito de destino no encontrado');

      const lockKey = [tenantId, productId, productLotId ?? 'no-lot', fromWarehouseId].join(':');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      const current = await tx.stockMovement.aggregate({
        where: { tenantId, productId, productLotId: productLotId ?? null, warehouseId: fromWarehouseId },
        _sum: { quantity: true },
      });
      const available = Number(current._sum.quantity ?? 0);
      if (available < quantity) {
        throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: 'No hay stock suficiente en el depósito de origen', available: available.toFixed(3), requested: quantity.toFixed(3) });
      }

      const base = { tenantId, productId, productLotId: productLotId ?? null, operationId, referenceType: 'stock_transfer' as const, notes };
      await tx.stockMovement.create({ data: { ...base, warehouseId: fromWarehouseId, quantity: qty.negated(), movementType: MovementType.transfer_out } });
      await tx.stockMovement.create({ data: { ...base, warehouseId: toWarehouseId, quantity: qty, movementType: MovementType.transfer_in } });
      return { operationId, quantity: qty.toFixed(3), fromWarehouseId, toWarehouseId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /** `AND` que limita a los depósitos de la sucursal activa (lista vacía = no ve nada). */
  private branchFilter(warehouseIds: string[] | undefined) {
    if (!warehouseIds) return Prisma.empty;
    if (warehouseIds.length === 0) return Prisma.sql`AND false`;
    return Prisma.sql`AND sm.warehouse_id IN (${Prisma.join(warehouseIds.map(id => Prisma.sql`${id}::uuid`))})`;
  }

  async current(tenantId: string, productId: string, warehouseId?: string, productLotId?: string, warehouseIds?: string[]) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const rows = await this.prisma.$queryRaw<Array<{ warehouseId: string; warehouseName: string; productLotId: string | null; lotNumber: string | null; expirationDate: Date | null; supplierName: string | null; quantity: Prisma.Decimal }>>`
      SELECT sm.warehouse_id AS "warehouseId", w.name AS "warehouseName", sm.product_lot_id AS "productLotId",
        pl.lot_number AS "lotNumber", pl.expiration_date AS "expirationDate", s.name AS "supplierName", SUM(sm.quantity) AS quantity
      FROM stock_movements sm JOIN warehouses w ON w.id = sm.warehouse_id AND w.tenant_id = sm.tenant_id
      LEFT JOIN product_lots pl ON pl.id = sm.product_lot_id AND pl.tenant_id = sm.tenant_id
      LEFT JOIN suppliers s ON s.id = pl.supplier_id AND s.tenant_id = sm.tenant_id
      WHERE sm.tenant_id = ${tenantId}::uuid AND sm.product_id = ${productId}::uuid
        ${warehouseId ? Prisma.sql`AND sm.warehouse_id = ${warehouseId}::uuid` : Prisma.empty}
        ${productLotId ? Prisma.sql`AND sm.product_lot_id = ${productLotId}::uuid` : Prisma.empty}
        ${this.branchFilter(warehouseIds)}
      GROUP BY sm.warehouse_id, w.name, sm.product_lot_id, pl.lot_number, pl.expiration_date, s.name
      HAVING SUM(sm.quantity) <> 0 ORDER BY w.name, pl.lot_number
    `;
    return { productId, items: rows.map(row => ({ ...row, quantity: row.quantity.toFixed(3) })) };
  }

  async currentAll(tenantId: string, warehouseIds?: string[]) {
    const rows = await this.prisma.$queryRaw<Array<{ productId: string; productName: string; warehouseId: string; warehouseName: string; productLotId: string | null; lotNumber: string | null; expirationDate: Date | null; supplierName: string | null; quantity: Prisma.Decimal }>>`
      SELECT sm.product_id AS "productId", p.name AS "productName", sm.warehouse_id AS "warehouseId", w.name AS "warehouseName",
        sm.product_lot_id AS "productLotId", pl.lot_number AS "lotNumber", pl.expiration_date AS "expirationDate", s.name AS "supplierName", SUM(sm.quantity) AS quantity
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id AND p.tenant_id = sm.tenant_id
      JOIN warehouses w ON w.id = sm.warehouse_id AND w.tenant_id = sm.tenant_id
      LEFT JOIN product_lots pl ON pl.id = sm.product_lot_id AND pl.tenant_id = sm.tenant_id
      LEFT JOIN suppliers s ON s.id = pl.supplier_id AND s.tenant_id = sm.tenant_id
      WHERE sm.tenant_id = ${tenantId}::uuid
        ${this.branchFilter(warehouseIds)}
      GROUP BY sm.product_id, p.name, sm.warehouse_id, w.name, sm.product_lot_id, pl.lot_number, pl.expiration_date, s.name
      HAVING SUM(sm.quantity) <> 0 ORDER BY p.name, w.name, pl.lot_number
    `;
    return { items: rows.map(row => ({ ...row, quantity: row.quantity.toFixed(3) })) };
  }

  async history(tenantId: string, query: Record<string, string | undefined>, warehouseIds?: string[]) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20));

    const conditions: Prisma.StockMovementWhereInput[] = [{ tenantId }];
    if (warehouseIds) conditions.push({ warehouseId: { in: warehouseIds } });
    if (query.warehouseId) conditions.push({ warehouseId: query.warehouseId });
    if (query.movementType) conditions.push({ movementType: query.movementType as MovementType });
    if (query.fromDate || query.toDate) {
      conditions.push({
        occurredAt: {
          gte: query.fromDate ? new Date(`${query.fromDate}T00:00:00`) : undefined,
          lte: query.toDate ? new Date(`${query.toDate}T23:59:59.999`) : undefined,
        },
      });
    }
    if (query.search) {
      conditions.push({ product: { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { barcode: { contains: query.search, mode: 'insensitive' } }] } });
    }
    if (query.supplierId) {
      const [lots, invoices] = await Promise.all([
        this.prisma.productLot.findMany({ where: { tenantId, supplierId: query.supplierId }, select: { id: true } }),
        this.prisma.purchaseInvoice.findMany({ where: { tenantId, supplierId: query.supplierId }, select: { id: true } }),
      ]);
      conditions.push({ OR: [{ productLotId: { in: lots.map(l => l.id) } }, { referenceId: { in: invoices.map(i => i.id) } }] });
    }
    const where: Prisma.StockMovementWhereInput = { AND: conditions };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: { product: { select: { name: true, barcode: true } }, productLot: { select: { lotNumber: true, expirationDate: true } }, warehouse: { select: { name: true } } },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return {
      items: items.map(item => ({
        ...item,
        productName: item.product.name,
        productBarcode: item.product.barcode,
        lotNumber: item.productLot?.lotNumber ?? null,
        expirationDate: item.productLot?.expirationDate ?? null,
        warehouseName: item.warehouse.name,
        product: undefined,
        productLot: undefined,
        warehouse: undefined,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
