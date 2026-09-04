import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { cotizar, type LineaPedida } from './sale-pricing.util';
import { registrarMovimientoCuenta } from './cuenta-corriente.util';

const FORMAS_PAGO = ['cash', 'card', 'transfer', 'qr', 'account'] as const;
const PUNTO_VENTA_DEFAULT = '0001';
const TOLERANCIA = 0.01;

type Usuario = { id: string; tenantId: string; warehouseId?: string | null };

type PagoPedido = { method: (typeof FORMAS_PAGO)[number]; amount: number; reference: string | null };

@Injectable()
export class SalesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Lista con la que se le cobra a este cliente; sin cliente, la base del tenant. */
  private async listaDelCliente(tenantId: string, customerId?: string | null) {
    if (customerId) {
      const cliente = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!cliente) throw new BadRequestException('Cliente no encontrado');
      if (cliente.priceListId) return cliente.priceListId;
    }
    const base = await this.prisma.priceList.findFirst({ where: { tenantId, isDefault: true } });
    if (!base) throw new UnprocessableEntityException('No hay una lista de precios base configurada');
    return base.id;
  }

  private parseLineas(body: Record<string, unknown>): LineaPedida[] {
    const raw = Array.isArray(body.lines) ? body.lines : [];
    if (!raw.length) throw new UnprocessableEntityException('La venta no tiene productos');
    return raw.map(l => {
      const linea = l as Record<string, unknown>;
      const productId = typeof linea.productId === 'string' ? linea.productId : '';
      const quantity = Number(linea.quantity);
      if (!productId) throw new UnprocessableEntityException('Falta el producto en una línea');
      if (!Number.isFinite(quantity) || quantity <= 0) throw new UnprocessableEntityException('La cantidad debe ser mayor a cero');
      return { productId, quantity };
    });
  }

  /** Cotiza sin guardar: es lo que consulta la pantalla mientras se cargan productos. */
  async quote(tenantId: string, body: Record<string, unknown>) {
    const customerId = typeof body.customerId === 'string' && body.customerId ? body.customerId : null;
    const priceListId = await this.listaDelCliente(tenantId, customerId);
    const lineas = this.parseLineas(body);
    const cotizadas = await cotizar(this.prisma, tenantId, priceListId, lineas);

    const productos = await this.prisma.product.findMany({
      where: { tenantId, id: { in: lineas.map(l => l.productId) } },
      select: { id: true, name: true, barcode: true, unit: true },
    });
    const porId = new Map(productos.map(p => [p.id, p]));
    const lista = await this.prisma.priceList.findFirst({ where: { id: priceListId }, select: { id: true, name: true } });

    const sinPrecio = cotizadas.filter(c => c.listPrice <= 0).map(c => porId.get(c.productId)?.name ?? c.productId);

    return {
      priceList: lista,
      lines: cotizadas.map(c => ({ ...c, name: porId.get(c.productId)?.name ?? '', barcode: porId.get(c.productId)?.barcode ?? '', unit: porId.get(c.productId)?.unit ?? '' })),
      subtotal: cotizadas.reduce((s, c) => s + c.lineSubtotal, 0),
      discountTotal: cotizadas.reduce((s, c) => s + c.discountAmount, 0),
      taxTotal: cotizadas.reduce((s, c) => s + c.lineTax, 0),
      total: cotizadas.reduce((s, c) => s + c.lineTotal, 0),
      // Vender algo sin precio cargado seria regalarlo: se avisa antes de cobrar.
      withoutPrice: sinPrecio,
    };
  }

  /** Uno o varios medios de pago que tienen que sumar exacto el total de la venta. */
  private parsePagos(body: Record<string, unknown>, total: number, customerId: string | null): PagoPedido[] {
    // Compatibilidad con lo que mandaba la pantalla antes del pago dividido:
    // un paymentMethod suelto vale como un único pago por el total.
    const raw = Array.isArray(body.payments)
      ? body.payments
      : typeof body.paymentMethod === 'string' && body.paymentMethod
        ? [{ method: body.paymentMethod, amount: total }]
        : [];
    if (!raw.length) throw new UnprocessableEntityException('Indicá con qué se paga la venta');
    const pagos = raw.map(p => {
      const pago = p as Record<string, unknown>;
      const method = typeof pago.method === 'string' ? pago.method : '';
      if (!FORMAS_PAGO.includes(method as PagoPedido['method'])) throw new UnprocessableEntityException(`La forma de pago debe ser una de: ${FORMAS_PAGO.join(', ')}`);
      const amount = Number(pago.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new UnprocessableEntityException('El monto de cada pago debe ser mayor a cero');
      const reference = typeof pago.reference === 'string' && pago.reference.trim() ? pago.reference.trim() : null;
      return { method: method as PagoPedido['method'], amount: Math.round(amount * 100) / 100, reference };
    });
    if (pagos.some(p => p.method === 'account') && !customerId) throw new UnprocessableEntityException('La venta a cuenta corriente necesita un cliente, no puede ser a consumidor final');
    const suma = pagos.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(suma - total) > TOLERANCIA) throw new UnprocessableEntityException(`Los pagos suman ${suma.toFixed(2)} y la venta es ${total.toFixed(2)}`);
    return pagos;
  }

  async create(user: Usuario, body: Record<string, unknown>) {
    const tenantId = user.tenantId;
    if (!user.warehouseId) throw new UnprocessableEntityException('El usuario no tiene una sucursal/depósito asignado');

    const customerId = typeof body.customerId === 'string' && body.customerId ? body.customerId : null;
    const priceListId = await this.listaDelCliente(tenantId, customerId);
    const lineas = this.parseLineas(body);
    const pointOfSale = typeof body.pointOfSale === 'string' && body.pointOfSale ? body.pointOfSale : PUNTO_VENTA_DEFAULT;
    const docType = 'internal';

    const cotizadas = await cotizar(this.prisma, tenantId, priceListId, lineas);
    const sinPrecio = cotizadas.filter(c => c.listPrice <= 0);
    if (sinPrecio.length) throw new UnprocessableEntityException('Hay productos sin precio cargado; no se pueden vender');
    const total = Math.round(cotizadas.reduce((s, c) => s + c.lineTotal, 0) * 100) / 100;
    const pagos = this.parsePagos(body, total, customerId);
    const paymentMethod = pagos.length === 1 ? pagos[0].method : 'mixed';

    const productos = await this.prisma.product.findMany({
      where: { tenantId, id: { in: lineas.map(l => l.productId) } },
      select: { id: true, name: true, barcode: true, manejaVencimiento: true },
    });
    const porId = new Map(productos.map(p => [p.id, p]));

    return this.prisma.$transaction(async tx => {
      // Sin turno abierto no hay dónde imputar la venta ni con qué comparar el
      // efectivo al cerrar. Un usuario tiene a lo sumo un turno abierto.
      const turno = await tx.cashShift.findFirst({ where: { tenantId, openedById: user.id, status: 'open' } });
      if (!turno) throw new UnprocessableEntityException('Abrí un turno de caja antes de cobrar');

      // Numero de comprobante: mismo patron atomico que product_code_seq.
      await tx.saleSequence.upsert({
        where: { tenantId_docType_pointOfSale: { tenantId, docType, pointOfSale } },
        create: { tenantId, docType, pointOfSale, lastNumber: 0 },
        update: {},
      });
      const [{ last_number: number }] = await tx.$queryRaw<Array<{ last_number: number }>>`
        UPDATE sale_sequences SET last_number = last_number + 1
        WHERE tenant_id = ${tenantId}::uuid AND doc_type = ${docType} AND point_of_sale = ${pointOfSale}
        RETURNING last_number
      `;

      const venta = await tx.sale.create({
        data: {
          tenantId,
          warehouseId: user.warehouseId!,
          customerId,
          userId: user.id,
          priceListId,
          shiftId: turno.id,
          docType,
          pointOfSale,
          number,
          paymentMethod,
          subtotal: cotizadas.reduce((s, c) => s + c.lineSubtotal, 0),
          discountTotal: cotizadas.reduce((s, c) => s + c.discountAmount, 0),
          taxTotal: cotizadas.reduce((s, c) => s + c.lineTax, 0),
          total,
          occurredAt: new Date(),
        },
      });

      await tx.salePayment.createMany({
        data: pagos.map(p => ({ tenantId, saleId: venta.id, method: p.method, amount: p.amount, reference: p.reference })),
      });

      const pagoCuenta = pagos.find(p => p.method === 'account');
      if (pagoCuenta) {
        await registrarMovimientoCuenta(tx, tenantId, customerId!, pagoCuenta.amount, { type: 'sale', saleId: venta.id, userId: user.id });
      }

      for (const c of cotizadas) {
        const producto = porId.get(c.productId);
        if (!producto) throw new UnprocessableEntityException('Un producto de la venta ya no existe');

        // Productos con vencimiento: se elige el lote que vence primero y tiene
        // stock (FEFO). Pedirselo al vendedor trabaria el mostrador.
        let productLotId: string | null = null;
        if (producto.manejaVencimiento) {
          productLotId = await this.loteFEFO(tx, tenantId, c.productId, user.warehouseId!, c.quantity);
          if (!productLotId) throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: `No hay un lote con stock suficiente de ${producto.name}` });
        }

        await tx.saleLine.create({
          data: {
            tenantId, saleId: venta.id, productId: c.productId, productLotId,
            barcode: producto.barcode, description: producto.name,
            quantity: c.quantity, listPrice: c.listPrice, unitPrice: c.unitPrice,
            discountAmount: c.discountAmount, promotionId: c.promotionId, promotionName: c.promotionName,
            taxRate: c.taxRate, lineSubtotal: c.lineSubtotal, lineTax: c.lineTax, lineTotal: c.lineTotal,
          },
        });

        // El stock se descuenta con la misma validacion que cualquier egreso.
        await this.egreso(tx, tenantId, {
          productId: c.productId, productLotId, warehouseId: user.warehouseId!, quantity: c.quantity,
          movementType: 'sale_out', referenceType: 'sale', referenceId: venta.id,
          notes: `Venta ${pointOfSale}-${String(number).padStart(8, '0')}`,
        });
      }

      return tx.sale.findUniqueOrThrow({ where: { id: venta.id }, include: { lines: true, customer: { select: { name: true } } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /** Lote con vencimiento más próximo que tenga stock suficiente en el depósito. */
  private async loteFEFO(tx: Prisma.TransactionClient, tenantId: string, productId: string, warehouseId: string, cantidad: number) {
    const lotes = await tx.productLot.findMany({
      where: { tenantId, productId },
      orderBy: [{ expirationDate: 'asc' }, { lotNumber: 'asc' }],
      select: { id: true },
    });
    for (const lote of lotes) {
      const suma = await tx.stockMovement.aggregate({
        where: { tenantId, productId, productLotId: lote.id, warehouseId },
        _sum: { quantity: true },
      });
      if (Number(suma._sum.quantity ?? 0) >= cantidad) return lote.id;
    }
    return null;
  }

  /**
   * Egreso de stock con la misma proteccion que stock.service.createOut: lock
   * por producto/lote/deposito y verificacion de disponible. Va inline porque
   * ya estamos dentro de la transaccion Serializable de la venta.
   */
  private async egreso(
    tx: Prisma.TransactionClient,
    tenantId: string,
    m: { productId: string; productLotId: string | null; warehouseId: string; quantity: number; movementType: 'sale_out' | 'adjustment_in'; referenceType: string; referenceId: string; notes: string },
  ) {
    const lockKey = [tenantId, m.productId, m.productLotId ?? 'no-lot', m.warehouseId].join(':');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
    const actual = await tx.stockMovement.aggregate({
      where: { tenantId, productId: m.productId, productLotId: m.productLotId, warehouseId: m.warehouseId },
      _sum: { quantity: true },
    });
    const disponible = Number(actual._sum.quantity ?? 0);
    if (m.movementType === 'sale_out' && disponible < m.quantity) {
      const producto = await tx.product.findUnique({ where: { id: m.productId }, select: { name: true } });
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        message: `Stock insuficiente de ${producto?.name ?? 'un producto'}`,
        available: disponible.toFixed(3),
        requested: m.quantity.toFixed(3),
      });
    }
    const cantidad = new Prisma.Decimal(m.quantity);
    await tx.stockMovement.create({
      data: {
        tenantId, productId: m.productId, productLotId: m.productLotId, warehouseId: m.warehouseId,
        quantity: m.movementType === 'sale_out' ? cantidad.negated() : cantidad,
        movementType: m.movementType, referenceType: m.referenceType, referenceId: m.referenceId, notes: m.notes,
      },
    });
  }

  async list(tenantId: string, query: Record<string, string | undefined>) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20));
    const where: Prisma.SaleWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.from || query.to
        ? { occurredAt: { gte: query.from ? new Date(`${query.from}T00:00:00`) : undefined, lte: query.to ? new Date(`${query.to}T23:59:59.999`) : undefined } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({ where, include: { customer: { select: { name: true } }, user: { select: { name: true } }, _count: { select: { lines: true } } }, orderBy: { occurredAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.sale.count({ where }),
    ]);
    return {
      items: items.map(s => ({ ...s, customerName: s.customer?.name ?? null, userName: s.user.name, lineCount: s._count.lines, customer: undefined, user: undefined, _count: undefined })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async get(tenantId: string, id: string) {
    const venta = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: { lines: true, payments: true, customer: { select: { name: true } }, user: { select: { name: true } }, warehouse: { select: { name: true } } },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return { ...venta, customerName: venta.customer?.name ?? null, userName: venta.user.name, warehouseName: venta.warehouse.name };
  }

  /**
   * Anula: la venta no se borra ni se edita (misma regla que las compras), se
   * marca cancelled y el stock vuelve con movimientos de ajuste. Si se había
   * pagado (total o parcialmente) a cuenta corriente, esa parte se revierte
   * como un ajuste — no se puede "reeditar" la venta que la originó.
   */
  async cancel(user: Usuario, id: string, body: Record<string, unknown>) {
    const tenantId = user.tenantId;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new UnprocessableEntityException('Indicá el motivo de la anulación');

    return this.prisma.$transaction(async tx => {
      const venta = await tx.sale.findFirst({ where: { id, tenantId }, include: { lines: true, payments: true } });
      if (!venta) throw new NotFoundException('Venta no encontrada');
      if (venta.status === 'cancelled') throw new ConflictException('La venta ya está anulada');

      const pagoCuenta = venta.payments.find(p => p.method === 'account');
      if (pagoCuenta && venta.customerId) {
        await registrarMovimientoCuenta(tx, tenantId, venta.customerId, -Number(pagoCuenta.amount), {
          type: 'adjustment', saleId: venta.id, userId: user.id,
          notes: `Anulación de venta ${venta.pointOfSale}-${String(venta.number).padStart(8, '0')}: ${reason}`,
        });
      }

      for (const linea of venta.lines) {
        await this.egreso(tx, tenantId, {
          productId: linea.productId, productLotId: linea.productLotId, warehouseId: venta.warehouseId,
          quantity: Number(linea.quantity), movementType: 'adjustment_in',
          referenceType: 'sale_cancellation', referenceId: venta.id,
          notes: `Anulación de venta ${venta.pointOfSale}-${String(venta.number).padStart(8, '0')}: ${reason}`,
        });
      }
      return tx.sale.update({ where: { id }, data: { status: 'cancelled', cancelReason: reason } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
