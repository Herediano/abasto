import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, PurchaseInvoiceStatus, PurchaseInvoiceType } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

type InvoiceLineInput = { barcode?: unknown; productId?: unknown; productLotId?: unknown; quantity?: unknown; unitCost?: unknown; taxRate?: unknown };

@Injectable()
export class PurchasesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private money(value: unknown, field: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new UnprocessableEntityException(`${field} debe ser un número mayor o igual a cero`);
    return n;
  }

  async createDraft(user: { id: string; tenantId: string; warehouseId?: string | null }, body: Record<string, unknown>) {
    if (!user.warehouseId) throw new UnprocessableEntityException('El usuario no tiene una sucursal/depósito asignado');
    const supplierId = typeof body.supplierId === 'string' ? body.supplierId : '';
    const invoiceType = typeof body.invoiceType === 'string' ? body.invoiceType as PurchaseInvoiceType : PurchaseInvoiceType.other;
    const pointOfSale = typeof body.pointOfSale === 'string' ? body.pointOfSale.trim() : '';
    const invoiceNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : '';
    const issueDate = new Date(String(body.issueDate ?? ''));
    const rawLines = Array.isArray(body.lines) ? body.lines as InvoiceLineInput[] : [];
    if (!supplierId || !pointOfSale || !invoiceNumber || Number.isNaN(issueDate.getTime()) || rawLines.length === 0) throw new UnprocessableEntityException('supplierId, invoiceType, pointOfSale, invoiceNumber, issueDate y al menos una línea son obligatorios');
    if (!Object.values(PurchaseInvoiceType).includes(invoiceType)) throw new UnprocessableEntityException('invoiceType no es válido');
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId: user.tenantId, isActive: true } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: user.warehouseId, tenantId: user.tenantId, isActive: true } });
    if (!warehouse) throw new UnprocessableEntityException('La sucursal/depósito asignado al usuario no existe');
    const lines: Array<{ productId: string; productLotId?: string; barcode: string; description: string; quantity: number; unitCost: number; taxRate: number; lineSubtotal: number; lineTax: number; lineTotal: number }> = [];
    for (const line of rawLines) {
      const barcode = typeof line.barcode === 'string' ? line.barcode.trim() : '';
      const product = barcode ? await this.prisma.product.findFirst({ where: { tenantId: user.tenantId, barcode, isActive: true } }) : null;
      if (!product) throw new UnprocessableEntityException(`No existe un producto activo con barcode ${barcode || '(vacío)'}`);
      const quantity = this.money(line.quantity, 'quantity');
      const unitCost = this.money(line.unitCost, 'unitCost');
      const taxRate = this.money(line.taxRate ?? 0, 'taxRate');
      if (quantity <= 0) throw new UnprocessableEntityException('quantity debe ser mayor a cero');
      const productLotId = typeof line.productLotId === 'string' && line.productLotId ? line.productLotId : undefined;
      if (product.manejaVencimiento && !productLotId) throw new UnprocessableEntityException(`El producto ${product.name} requiere lote`);
      if (productLotId && !(await this.prisma.productLot.findFirst({ where: { id: productLotId, tenantId: user.tenantId, productId: product.id } }))) throw new UnprocessableEntityException('El lote no corresponde al producto');
      const lineSubtotal = Number((quantity * unitCost).toFixed(2));
      const lineTax = Number((lineSubtotal * taxRate / 100).toFixed(2));
      lines.push({ productId: product.id, productLotId, barcode: product.barcode, description: product.name, quantity, unitCost, taxRate, lineSubtotal, lineTax, lineTotal: Number((lineSubtotal + lineTax).toFixed(2)) });
    }
    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const taxTotal = lines.reduce((sum, line) => sum + line.lineTax, 0);
    const total = subtotal + taxTotal;
    try {
      return this.prisma.purchaseInvoice.create({ data: { tenantId: user.tenantId, supplierId, warehouseId: user.warehouseId, createdById: user.id, invoiceType, pointOfSale, invoiceNumber, issueDate, currency: typeof body.currency === 'string' ? body.currency : 'ARS', subtotal, taxTotal, total, notes: typeof body.notes === 'string' ? body.notes : undefined, lines: { create: lines.map(line => line) } }, include: { supplier: true, lines: true, warehouse: true } });
    } catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una factura con ese tipo, punto de venta y número'); throw error; }
  }

  async confirm(tenantId: string, invoiceId: string) {
    return this.prisma.$transaction(async tx => {
      const invoice = await tx.purchaseInvoice.findFirst({ where: { id: invoiceId, tenantId }, include: { lines: true } });
      if (!invoice) throw new NotFoundException('Factura no encontrada');
      if (invoice.status === PurchaseInvoiceStatus.confirmed) return invoice;
      if (invoice.status !== PurchaseInvoiceStatus.draft) throw new ConflictException('La factura no se puede confirmar en su estado actual');
      for (const line of invoice.lines) {
        const product = await tx.product.findFirst({ where: { id: line.productId, tenantId } });
        if (!product) throw new UnprocessableEntityException('Un producto de la factura ya no existe');
        if (product.manejaVencimiento && !line.productLotId) throw new UnprocessableEntityException(`El producto ${product.name} requiere lote`);
        if (line.productLotId && !(await tx.productLot.findFirst({ where: { id: line.productLotId, tenantId, productId: line.productId } }))) throw new UnprocessableEntityException('Un lote de la factura no corresponde al producto');
        await tx.stockMovement.create({ data: { tenantId, productId: line.productId, productLotId: line.productLotId, warehouseId: invoice.warehouseId, quantity: line.quantity, movementType: 'purchase_in', referenceType: 'purchase_invoice', referenceId: invoice.id, notes: `Factura ${invoice.invoiceType} ${invoice.pointOfSale}-${invoice.invoiceNumber}` } });
      }
      return tx.purchaseInvoice.update({ where: { id: invoice.id }, data: { status: PurchaseInvoiceStatus.confirmed }, include: { supplier: true, lines: true, warehouse: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  list(tenantId: string) { return this.prisma.purchaseInvoice.findMany({ where: { tenantId }, include: { supplier: { select: { name: true } }, warehouse: { select: { name: true } } }, orderBy: { issueDate: 'desc' } }); }
}
