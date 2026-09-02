import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, PurchaseInvoiceStatus, PurchaseInvoiceType } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

type InvoiceLineInput = { barcode?: unknown; productId?: unknown; productLotId?: unknown; quantity?: unknown; unitCost?: unknown; taxRate?: unknown; byPackage?: unknown; unitFactor?: unknown };
type OtherTaxInput = { label?: unknown; amount?: unknown };
type OtherTax = { label: string; amount: number };

const CORRECTABLE_STATUSES: PurchaseInvoiceStatus[] = [PurchaseInvoiceStatus.confirmed, PurchaseInvoiceStatus.corrected];

@Injectable()
export class PurchasesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private money(value: unknown, field: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new UnprocessableEntityException(`${field} debe ser un número mayor o igual a cero`);
    return n;
  }

  private parseOtherTaxes(raw: unknown): OtherTax[] {
    if (!Array.isArray(raw)) return [];
    return (raw as OtherTaxInput[]).map(item => {
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      if (!label) throw new UnprocessableEntityException('Cada impuesto adicional necesita un nombre');
      return { label, amount: this.money(item.amount, `otherTaxes.${label}`) };
    });
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
    const lines: Array<{ productId: string; productLotId?: string; barcode: string; description: string; quantity: number; unitFactor: number; unitCost: number; taxRate: number; lineSubtotal: number; lineTax: number; lineTotal: number }> = [];
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
      // El factor se resuelve del producto, no del cliente, y queda congelado en la linea.
      const unitFactor = line.byPackage === true ? Number(product.unitsPerPurchase) : 1;
      const lineSubtotal = Number((quantity * unitCost).toFixed(2));
      const lineTax = Number((lineSubtotal * taxRate / 100).toFixed(2));
      lines.push({ productId: product.id, productLotId, barcode: product.barcode, description: product.name, quantity, unitFactor, unitCost, taxRate, lineSubtotal, lineTax, lineTotal: Number((lineSubtotal + lineTax).toFixed(2)) });
    }
    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const taxTotal = lines.reduce((sum, line) => sum + line.lineTax, 0);
    const otherTaxes = this.parseOtherTaxes(body.otherTaxes);
    const otherTaxesTotal = otherTaxes.reduce((sum, t) => sum + t.amount, 0);
    const total = subtotal + taxTotal + otherTaxesTotal;
    try {
      return this.prisma.purchaseInvoice.create({ data: { tenantId: user.tenantId, supplierId, warehouseId: user.warehouseId, createdById: user.id, invoiceType, pointOfSale, invoiceNumber, issueDate, currency: typeof body.currency === 'string' ? body.currency : 'ARS', subtotal, taxTotal, otherTaxes: otherTaxes.length ? otherTaxes : undefined, otherTaxesTotal, total, notes: typeof body.notes === 'string' ? body.notes : undefined, lines: { create: lines.map(line => line) } }, include: { supplier: true, lines: true, warehouse: true } });
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
        // La factura viene en la unidad del proveedor (bulto); el ledger guarda
        // siempre la unidad base, asi que la conversion ocurre aca.
        const baseQuantity = new Prisma.Decimal(line.quantity).mul(line.unitFactor);
        const costPerBaseUnit = new Prisma.Decimal(line.unitCost).div(line.unitFactor).toDecimalPlaces(2);
        if (product.costPrice === null) {
          await tx.product.update({ where: { id: product.id }, data: { costPrice: costPerBaseUnit } });
          await tx.productPriceHistory.create({ data: {
            tenantId, productId: product.id, field: 'cost', oldValue: null,
            newValue: costPerBaseUnit, source: 'invoice', userId: invoice.createdById,
          } });
        }
        // Se arma solo el historial de a quien le compramos cada producto.
        await tx.productSupplier.upsert({
          where: { tenantId_productId_supplierId: { tenantId, productId: line.productId, supplierId: invoice.supplierId } },
          create: { tenantId, productId: line.productId, supplierId: invoice.supplierId, lastCost: costPerBaseUnit, lastPurchaseAt: invoice.issueDate },
          update: { lastCost: costPerBaseUnit, lastPurchaseAt: invoice.issueDate },
        });
        await tx.stockMovement.create({ data: { tenantId, productId: line.productId, productLotId: line.productLotId, warehouseId: invoice.warehouseId, quantity: baseQuantity, movementType: 'purchase_in', referenceType: 'purchase_invoice', referenceId: invoice.id, notes: `Factura ${invoice.invoiceType} ${invoice.pointOfSale}-${invoice.invoiceNumber}` } });
      }
      return tx.purchaseInvoice.update({ where: { id: invoice.id }, data: { status: PurchaseInvoiceStatus.confirmed }, include: { supplier: true, lines: true, warehouse: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async correct(user: { id: string; tenantId: string }, invoiceId: string, body: Record<string, unknown>) {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new UnprocessableEntityException('El motivo de la corrección es obligatorio');
    const invoice = await this.prisma.purchaseInvoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId }, include: { lines: true, supplier: true, warehouse: true } });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (!CORRECTABLE_STATUSES.includes(invoice.status)) throw new ConflictException('Solo se pueden corregir facturas confirmadas');
    const supplierId = typeof body.supplierId === 'string' ? body.supplierId : invoice.supplierId;
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId: user.tenantId, isActive: true } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    const rawLines = Array.isArray(body.lines) ? body.lines as InvoiceLineInput[] : invoice.lines;
    if (!rawLines.length) throw new UnprocessableEntityException('La factura debe tener al menos una línea');
    const lines: Array<{ productId: string; productLotId?: string; barcode: string; description: string; quantity: number; unitFactor: number; unitCost: number; taxRate: number; lineSubtotal: number; lineTax: number; lineTotal: number }> = [];
    for (const raw of rawLines) {
      const productId = typeof raw.productId === 'string' ? raw.productId : '';
      const barcode = typeof raw.barcode === 'string' ? raw.barcode.trim() : '';
      const product = await this.prisma.product.findFirst({ where: { tenantId: user.tenantId, isActive: true, ...(productId ? { id: productId } : { barcode }) } });
      if (!product) throw new UnprocessableEntityException(`No existe el producto ${barcode || productId || '(vacío)'}`);
      const quantity = this.money(raw.quantity, 'quantity'); const unitCost = this.money(raw.unitCost, 'unitCost'); const taxRate = this.money(raw.taxRate ?? 0, 'taxRate');
      if (quantity <= 0) throw new UnprocessableEntityException('quantity debe ser mayor a cero');
      const productLotId = typeof raw.productLotId === 'string' && raw.productLotId ? raw.productLotId : undefined;
      if (product.manejaVencimiento && !productLotId) throw new UnprocessableEntityException(`El producto ${product.name} requiere lote`);
      if (productLotId && !(await this.prisma.productLot.findFirst({ where: { id: productLotId, tenantId: user.tenantId, productId: product.id } }))) throw new UnprocessableEntityException('El lote no corresponde al producto');
      // rawLines puede venir del cliente (trae byPackage) o ser las lineas ya
      // guardadas de la factura (traen unitFactor); en ese caso se preserva.
      const stored = 'unitFactor' in raw && raw.unitFactor !== undefined && raw.unitFactor !== null ? Number(raw.unitFactor) : null;
      const byPackage = 'byPackage' in raw && raw.byPackage === true;
      const unitFactor = stored ?? (byPackage ? Number(product.unitsPerPurchase) : 1);
      const lineSubtotal = Number((quantity * unitCost).toFixed(2)); const lineTax = Number((lineSubtotal * taxRate / 100).toFixed(2));
      lines.push({ productId: product.id, productLotId, barcode: product.barcode, description: product.name, quantity, unitFactor, unitCost, taxRate, lineSubtotal, lineTax, lineTotal: Number((lineSubtotal + lineTax).toFixed(2)) });
    }
    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0); const taxTotal = lines.reduce((sum, line) => sum + line.lineTax, 0);
    const otherTaxes = this.parseOtherTaxes(body.otherTaxes);
    const otherTaxesTotal = otherTaxes.reduce((sum, t) => sum + t.amount, 0);
    const total = subtotal + taxTotal + otherTaxesTotal;
    return this.prisma.$transaction(async tx => {
      const current = await tx.purchaseInvoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId }, include: { lines: true } });
      if (!current || !CORRECTABLE_STATUSES.includes(current.status)) throw new ConflictException('La factura cambió de estado y debe recargarse');
      await tx.purchaseInvoiceRevision.create({ data: { tenantId: user.tenantId, invoiceId, createdById: user.id, reason, snapshot: { invoice: { supplierId: current.supplierId, invoiceType: current.invoiceType, pointOfSale: current.pointOfSale, invoiceNumber: current.invoiceNumber, issueDate: current.issueDate.toISOString(), currency: current.currency, subtotal: current.subtotal.toString(), taxTotal: current.taxTotal.toString(), otherTaxes: current.otherTaxes, otherTaxesTotal: current.otherTaxesTotal.toString(), total: current.total.toString(), notes: current.notes }, lines: current.lines.map(line => ({ productId: line.productId, productLotId: line.productLotId, barcode: line.barcode, description: line.description, quantity: line.quantity.toString(), unitCost: line.unitCost.toString(), taxRate: line.taxRate.toString(), lineSubtotal: line.lineSubtotal.toString(), lineTax: line.lineTax.toString(), lineTotal: line.lineTotal.toString() })) } } });
      // Se revierte con el unitFactor congelado en la linea, nunca con el actual
      // del producto: si el bulto cambio, usar el nuevo dejaria el stock descuadrado.
      for (const line of current.lines) await tx.stockMovement.create({ data: { tenantId: user.tenantId, productId: line.productId, productLotId: line.productLotId, warehouseId: current.warehouseId, quantity: new Prisma.Decimal(line.quantity).mul(line.unitFactor).negated(), movementType: 'adjustment_out', referenceType: 'purchase_invoice_correction', referenceId: invoiceId, notes: `Reversión por corrección de factura ${current.invoiceType} ${current.pointOfSale}-${current.invoiceNumber}` } });
      await tx.purchaseInvoiceLine.deleteMany({ where: { invoiceId, tenantId: user.tenantId } });
      const updated = await tx.purchaseInvoice.update({ where: { id: invoiceId }, data: { supplierId, invoiceType: typeof body.invoiceType === 'string' && Object.values(PurchaseInvoiceType).includes(body.invoiceType as PurchaseInvoiceType) ? body.invoiceType as PurchaseInvoiceType : current.invoiceType, pointOfSale: typeof body.pointOfSale === 'string' ? body.pointOfSale.trim() : current.pointOfSale, invoiceNumber: typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : current.invoiceNumber, issueDate: body.issueDate ? new Date(String(body.issueDate)) : current.issueDate, currency: typeof body.currency === 'string' ? body.currency : current.currency, subtotal, taxTotal, otherTaxes: otherTaxes.length ? otherTaxes : Prisma.JsonNull, otherTaxesTotal, total, status: PurchaseInvoiceStatus.corrected, notes: typeof body.notes === 'string' ? body.notes : current.notes, lines: { create: lines } }, include: { supplier: true, lines: true, warehouse: true } });
      for (const line of lines) await tx.stockMovement.create({ data: { tenantId: user.tenantId, productId: line.productId, productLotId: line.productLotId, warehouseId: current.warehouseId, quantity: new Prisma.Decimal(line.quantity).mul(line.unitFactor), movementType: 'purchase_in', referenceType: 'purchase_invoice', referenceId: invoiceId, notes: `Factura corregida ${updated.invoiceType} ${updated.pointOfSale}-${updated.invoiceNumber}` } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancel(user: { id: string; tenantId: string }, invoiceId: string, body: Record<string, unknown>) {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason) throw new UnprocessableEntityException('El motivo de la anulación es obligatorio');
    return this.prisma.$transaction(async tx => {
      const invoice = await tx.purchaseInvoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId }, include: { lines: true } });
      if (!invoice) throw new NotFoundException('Factura no encontrada');
      if (!CORRECTABLE_STATUSES.includes(invoice.status)) throw new ConflictException('Solo se pueden anular facturas confirmadas');
      await tx.purchaseInvoiceRevision.create({ data: { tenantId: user.tenantId, invoiceId, createdById: user.id, reason: `Anulación: ${reason}`, snapshot: { invoice: { supplierId: invoice.supplierId, invoiceType: invoice.invoiceType, pointOfSale: invoice.pointOfSale, invoiceNumber: invoice.invoiceNumber, issueDate: invoice.issueDate.toISOString(), currency: invoice.currency, subtotal: invoice.subtotal.toString(), taxTotal: invoice.taxTotal.toString(), total: invoice.total.toString(), notes: invoice.notes }, lines: invoice.lines.map(line => ({ productId: line.productId, productLotId: line.productLotId, barcode: line.barcode, description: line.description, quantity: line.quantity.toString(), unitCost: line.unitCost.toString(), taxRate: line.taxRate.toString(), lineSubtotal: line.lineSubtotal.toString(), lineTax: line.lineTax.toString(), lineTotal: line.lineTotal.toString() })) } } });
      for (const line of invoice.lines) await tx.stockMovement.create({ data: { tenantId: user.tenantId, productId: line.productId, productLotId: line.productLotId, warehouseId: invoice.warehouseId, quantity: new Prisma.Decimal(line.quantity).mul(line.unitFactor).negated(), movementType: 'adjustment_out', referenceType: 'purchase_invoice_cancellation', referenceId: invoiceId, notes: `Anulación de factura ${invoice.invoiceType} ${invoice.pointOfSale}-${invoice.invoiceNumber}: ${reason}` } });
      return tx.purchaseInvoice.update({ where: { id: invoiceId }, data: { status: PurchaseInvoiceStatus.cancelled }, include: { supplier: true, lines: true, warehouse: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  list(tenantId: string) { return this.prisma.purchaseInvoice.findMany({ where: { tenantId }, include: { supplier: { select: { name: true } }, warehouse: { select: { name: true } }, lines: true }, orderBy: { issueDate: 'desc' } }); }
}
