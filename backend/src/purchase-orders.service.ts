import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AuthUser } from './auth.types';

/**
 * El pedido a proveedor: la contracara liviana de la Orden de Compra de otros
 * sistemas. Nace casi siempre desde Reposición ("esto está bajo el mínimo,
 * pedile a este proveedor") y se cierra a mano cuando llega — no intenta
 * reconciliar cantidades contra la factura (eso sería 3-way matching, de más
 * para un mayorista). Sirve para no perder de vista qué se le pidió a quién
 * entre que se decide reponer y que efectivamente se carga la factura.
 */
@Injectable()
export class PurchaseOrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(tenantId: string, warehouseIds: string[] | undefined, query: Record<string, string | undefined>) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        ...(warehouseIds ? { warehouseId: { in: warehouseIds } } : {}),
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      },
      include: {
        supplier: { select: { name: true } },
        createdBy: { select: { name: true } },
        lines: { include: { product: { select: { name: true, barcode: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: AuthUser, body: Record<string, unknown>) {
    const tenantId = user.tenantId;
    const supplierId = typeof body.supplierId === 'string' ? body.supplierId : '';
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
    if (!supplier) throw new BadRequestException('Proveedor no encontrado');
    const warehouseId = typeof body.warehouseId === 'string' && body.warehouseId ? body.warehouseId : user.warehouseId;
    if (!warehouseId) throw new UnprocessableEntityException('Tu usuario no tiene depósito asignado');
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId } });
    if (!warehouse) throw new BadRequestException('Depósito no encontrado');

    const rawLines = Array.isArray(body.lines) ? body.lines as Array<Record<string, unknown>> : [];
    if (!rawLines.length) throw new UnprocessableEntityException('El pedido tiene que tener al menos un producto');
    const lines = rawLines.map(l => {
      const productId = typeof l.productId === 'string' ? l.productId : '';
      const quantity = Number(l.quantity);
      if (!productId) throw new UnprocessableEntityException('Falta el producto en una línea');
      if (!Number.isFinite(quantity) || quantity <= 0) throw new UnprocessableEntityException('La cantidad tiene que ser mayor a cero');
      // Sin tenantId acá: la FK compuesta de PurchaseOrderLine lo toma del
      // padre en el nested create, ponerlo a mano rompe la validación de Prisma.
      return { productId, quantity };
    });

    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    return this.prisma.purchaseOrder.create({
      data: { tenantId, supplierId, warehouseId, createdById: user.id, notes, lines: { create: lines } },
      include: { supplier: { select: { name: true } }, lines: { include: { product: { select: { name: true, barcode: true } } } } },
    });
  }

  private async encontrarAbierto(tenantId: string, id: string) {
    const orden = await this.prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!orden) throw new NotFoundException('Pedido no encontrado');
    if (orden.status !== 'open') throw new ConflictException('Este pedido ya no está abierto');
    return orden;
  }

  /** Marca el pedido como recibido: no mueve stock ni linkea ninguna factura, es sólo "ya llegó, dejá de esperarlo". */
  async markReceived(tenantId: string, id: string) {
    await this.encontrarAbierto(tenantId, id);
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'received' } });
  }

  async cancel(tenantId: string, id: string) {
    await this.encontrarAbierto(tenantId, id);
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'cancelled' } });
  }
}
