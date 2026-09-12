import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, PurchaseInvoiceStatus, PurchaseInvoiceType } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { registrarMovimientoCuentaProveedor } from './cuenta-corriente-proveedor.util';

type InvoiceLineInput = { barcode?: unknown; productId?: unknown; productLotId?: unknown; quantity?: unknown; unitCost?: unknown; discountPercent?: unknown; taxRate?: unknown; byPackage?: unknown; unitFactor?: unknown };
type OtherTaxInput = { label?: unknown; amount?: unknown };
type OtherTax = { label: string; amount: number };

// "received" entra acá también: una factura que llegó sin el papel fiscal
// todavía se puede corregir o anular igual que una confirmada — el stock que
// generó es real independientemente de si ya tiene número de factura.
const CORRECTABLE_STATUSES: PurchaseInvoiceStatus[] = [PurchaseInvoiceStatus.confirmed, PurchaseInvoiceStatus.corrected, PurchaseInvoiceStatus.received];

@Injectable()
export class PurchasesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private money(value: unknown, field: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new UnprocessableEntityException(`${field} debe ser un número mayor o igual a cero`);
    return n;
  }

  /** Un kit/combo no se compra armado a un proveedor — se arma con el stock de sus componentes al venderlo. */
  private async esKit(tenantId: string, productId: string) {
    return (await this.prisma.productComponent.count({ where: { tenantId, kitProductId: productId } })) > 0;
  }

  /** Bonificación de línea (0-100): "10+1" ≈ 9.09%, o el % que la factura ya trae. */
  private percent(value: unknown, field: string) {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new UnprocessableEntityException(`${field} debe ser un número entre 0 y 100`);
    return n;
  }

  /**
   * Resuelve el producto de una línea. Por id si viene; si no, por código: primero
   * el barcode del producto, y si no matchea, el código del bulto cerrado
   * (packBarcode) — en ese caso `scannedPack` avisa que hay que cargar por bulto.
   */
  private async resolveLineProduct(tenantId: string, opts: { productId?: string; barcode?: string }) {
    if (opts.productId) {
      const product = await this.prisma.product.findFirst({ where: { tenantId, id: opts.productId, isActive: true } });
      return { product, scannedPack: false };
    }
    const code = (opts.barcode ?? '').trim();
    if (!code) return { product: null, scannedPack: false };
    const byBarcode = await this.prisma.product.findFirst({ where: { tenantId, barcode: code, isActive: true } });
    if (byBarcode) return { product: byBarcode, scannedPack: false };
    const byPack = await this.prisma.product.findFirst({ where: { tenantId, packBarcode: code, isActive: true } });
    return { product: byPack, scannedPack: !!byPack };
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
    // "Todavía no tengo la factura": la mercadería entra igual con lo que haya
    // (remito), y pointOfSale/invoiceNumber quedan en null hasta "completar
    // factura". Sin este flag, los dos son obligatorios como siempre.
    const pendingInvoice = body.pendingInvoice === true;
    const pointOfSale = typeof body.pointOfSale === 'string' ? body.pointOfSale.trim() : '';
    const invoiceNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : '';
    const remitoNumber = typeof body.remitoNumber === 'string' && body.remitoNumber.trim() ? body.remitoNumber.trim() : null;
    const issueDate = new Date(String(body.issueDate ?? ''));
    const dueDate = body.dueDate ? new Date(String(body.dueDate)) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) throw new UnprocessableEntityException('La fecha de vencimiento no es válida');
    const rawLines = Array.isArray(body.lines) ? body.lines as InvoiceLineInput[] : [];
    if (!supplierId || Number.isNaN(issueDate.getTime()) || rawLines.length === 0) throw new UnprocessableEntityException('supplierId, invoiceType, issueDate y al menos una línea son obligatorios');
    if (!pendingInvoice && (!pointOfSale || !invoiceNumber)) throw new UnprocessableEntityException('pointOfSale e invoiceNumber son obligatorios (o marcá "todavía no tengo la factura")');
    if (!Object.values(PurchaseInvoiceType).includes(invoiceType)) throw new UnprocessableEntityException('invoiceType no es válido');
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId: user.tenantId, isActive: true } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: user.warehouseId, tenantId: user.tenantId, isActive: true } });
    if (!warehouse) throw new UnprocessableEntityException('La sucursal/depósito asignado al usuario no existe');
    const lines: Array<{ productId: string; productLotId?: string; barcode: string; description: string; quantity: number; unitFactor: number; unitCost: number; discountPercent: number; taxRate: number; lineSubtotal: number; lineTax: number; lineTotal: number }> = [];
    for (const line of rawLines) {
      const barcode = typeof line.barcode === 'string' ? line.barcode.trim() : '';
      const { product, scannedPack } = await this.resolveLineProduct(user.tenantId, { barcode });
      if (!product) throw new UnprocessableEntityException(`No existe un producto activo con barcode ${barcode || '(vacío)'}`);
      if (await this.esKit(user.tenantId, product.id)) throw new UnprocessableEntityException(`${product.name} es un combo armado con otros productos; no se compra directo, se arma solo con el stock de sus componentes`);
      const quantity = this.money(line.quantity, 'quantity');
      const unitCost = this.money(line.unitCost, 'unitCost');
      const discountPercent = this.percent(line.discountPercent, 'discountPercent');
      const taxRate = this.money(line.taxRate ?? 0, 'taxRate');
      if (quantity <= 0) throw new UnprocessableEntityException('quantity debe ser mayor a cero');
      const productLotId = typeof line.productLotId === 'string' && line.productLotId ? line.productLotId : undefined;
      if (product.manejaVencimiento && !productLotId) throw new UnprocessableEntityException(`El producto ${product.name} requiere lote`);
      if (productLotId && !(await this.prisma.productLot.findFirst({ where: { id: productLotId, tenantId: user.tenantId, productId: product.id } }))) throw new UnprocessableEntityException('El lote no corresponde al producto');
      // El factor se resuelve del producto, no del cliente, y queda congelado en la
      // linea. Escanear el código del bulto ya implica cargar por bulto.
      const unitFactor = (scannedPack || line.byPackage === true) ? Number(product.unitsPerPurchase) : 1;
      // unitCost es el precio de lista; el IVA (y todo lo demás) se calcula
      // sobre el neto de bonificación, no sobre el bruto.
      const netUnitCost = unitCost * (1 - discountPercent / 100);
      const lineSubtotal = Number((quantity * netUnitCost).toFixed(2));
      const lineTax = Number((lineSubtotal * taxRate / 100).toFixed(2));
      lines.push({ productId: product.id, productLotId, barcode: product.barcode, description: product.name, quantity, unitFactor, unitCost, discountPercent, taxRate, lineSubtotal, lineTax, lineTotal: Number((lineSubtotal + lineTax).toFixed(2)) });
    }
    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const taxTotal = lines.reduce((sum, line) => sum + line.lineTax, 0);
    const otherTaxes = this.parseOtherTaxes(body.otherTaxes);
    const otherTaxesTotal = otherTaxes.reduce((sum, t) => sum + t.amount, 0);
    const total = subtotal + taxTotal + otherTaxesTotal;
    try {
      return this.prisma.purchaseInvoice.create({
        data: {
          tenantId: user.tenantId, supplierId, warehouseId: user.warehouseId, createdById: user.id, invoiceType,
          pointOfSale: pendingInvoice ? null : pointOfSale, invoiceNumber: pendingInvoice ? null : invoiceNumber,
          remitoNumber, issueDate, dueDate,
          currency: typeof body.currency === 'string' ? body.currency : 'ARS', subtotal, taxTotal,
          otherTaxes: otherTaxes.length ? otherTaxes : undefined, otherTaxesTotal, total,
          notes: typeof body.notes === 'string' ? body.notes : undefined, lines: { create: lines.map(line => line) },
        },
        include: { supplier: true, lines: true, warehouse: true },
      });
    } catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una factura con ese tipo, punto de venta y número'); throw error; }
  }

  async confirm(tenantId: string, userId: string, invoiceId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId }, select: { autoUpdateCostOnPurchase: true } });
    return this.prisma.$transaction(async tx => {
      const invoice = await tx.purchaseInvoice.findFirst({ where: { id: invoiceId, tenantId }, include: { lines: true } });
      if (!invoice) throw new NotFoundException('Factura no encontrada');
      if (invoice.status === PurchaseInvoiceStatus.confirmed || invoice.status === PurchaseInvoiceStatus.received) return invoice;
      if (invoice.status !== PurchaseInvoiceStatus.draft) throw new ConflictException('La factura no se puede confirmar en su estado actual');
      // Sin número de factura todavía (se cargó como "recibido, factura
      // pendiente"): el producto y el comprobante van a decir "sin número" en
      // las notas del movimiento hasta que se complete.
      const comprobante = invoice.invoiceNumber
        ? `Factura ${invoice.invoiceType} ${invoice.pointOfSale}-${invoice.invoiceNumber}`
        : `Remito${invoice.remitoNumber ? ` ${invoice.remitoNumber}` : ''} (factura pendiente)`;
      // El flete, aduana u otro cargo de "Otros impuestos" se prorratea entre
      // las líneas según su peso en el subtotal, así el costo que queda
      // cargado en el producto es el costo real puesto en el depósito, no
      // sólo lo que dice el renglón de la factura.
      const otherTaxesTotal = new Prisma.Decimal(invoice.otherTaxesTotal ?? 0);
      const subtotalFactura = new Prisma.Decimal(invoice.subtotal);
      for (const line of invoice.lines) {
        const product = await tx.product.findFirst({ where: { id: line.productId, tenantId } });
        if (!product) throw new UnprocessableEntityException('Un producto de la factura ya no existe');
        if (product.manejaVencimiento && !line.productLotId) throw new UnprocessableEntityException(`El producto ${product.name} requiere lote`);
        if (line.productLotId && !(await tx.productLot.findFirst({ where: { id: line.productLotId, tenantId, productId: line.productId } }))) throw new UnprocessableEntityException('Un lote de la factura no corresponde al producto');
        // La factura viene en la unidad del proveedor (bulto); el ledger guarda
        // siempre la unidad base, asi que la conversion ocurre aca.
        const baseQuantity = new Prisma.Decimal(line.quantity).mul(line.unitFactor);
        // Se parte del costo neto de bonificación (precio de lista de la línea
        // menos discountPercent), no del bruto: eso es lo que de verdad salió
        // de la empresa por unidad.
        let unitCostCargado = new Prisma.Decimal(line.unitCost).mul(new Prisma.Decimal(1).minus(new Prisma.Decimal(line.discountPercent).div(100)));
        if (otherTaxesTotal.greaterThan(0) && subtotalFactura.greaterThan(0)) {
          const proporcion = new Prisma.Decimal(line.lineSubtotal).div(subtotalFactura);
          unitCostCargado = unitCostCargado.add(otherTaxesTotal.mul(proporcion).div(line.quantity));
        }
        const costPerBaseUnit = unitCostCargado.div(line.unitFactor).toDecimalPlaces(2);
        // Sin costo todavía, siempre se carga: si no, el producto queda sin
        // costo para siempre. Con costo ya cargado, sólo se pisa solo si el
        // negocio activó "actualizar costo automático" en Ajustes → La
        // empresa; si no, la compra queda registrada (ProductSupplier.lastCost,
        // abajo) y aparece en /prices/pending-costs para decidir a mano.
        if (product.costPrice === null || tenant?.autoUpdateCostOnPurchase) {
          const costoAnterior = product.costPrice;
          if (costoAnterior === null || !costoAnterior.equals(costPerBaseUnit)) {
            await tx.product.update({ where: { id: product.id }, data: { costPrice: costPerBaseUnit } });
            await tx.productPriceHistory.create({ data: {
              tenantId, productId: product.id, field: 'cost', oldValue: costoAnterior,
              newValue: costPerBaseUnit, source: 'invoice', userId: invoice.createdById,
            } });
          }
        }
        // Se arma solo el historial de a quien le compramos cada producto.
        await tx.productSupplier.upsert({
          where: { tenantId_productId_supplierId: { tenantId, productId: line.productId, supplierId: invoice.supplierId } },
          create: { tenantId, productId: line.productId, supplierId: invoice.supplierId, lastCost: costPerBaseUnit, lastPurchaseAt: invoice.issueDate },
          update: { lastCost: costPerBaseUnit, lastPurchaseAt: invoice.issueDate },
        });
        await tx.stockMovement.create({ data: { tenantId, productId: line.productId, productLotId: line.productLotId, warehouseId: invoice.warehouseId, quantity: baseQuantity, movementType: 'purchase_in', referenceType: 'purchase_invoice', referenceId: invoice.id, notes: comprobante } });
      }
      // Si algún producto de la factura quedó sin proveedor preferido, se toma el
      // más antiguo (para que Reposición pueda decir a quién pedirle).
      for (const productId of [...new Set(invoice.lines.map(l => l.productId))]) {
        if (await tx.productSupplier.findFirst({ where: { tenantId, productId, isPreferred: true }, select: { id: true } })) continue;
        const primero = await tx.productSupplier.findFirst({ where: { tenantId, productId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
        if (primero) await tx.productSupplier.update({ where: { id: primero.id }, data: { isPreferred: true } });
      }
      // La mercadería recibida ya es una deuda real con el proveedor, tenga o
      // no el número de factura todavía (un remito solo ya prueba la deuda).
      await registrarMovimientoCuentaProveedor(tx, tenantId, invoice.supplierId, Number(invoice.total), {
        type: 'invoice', purchaseInvoiceId: invoice.id, userId, notes: comprobante,
      });
      const nuevoEstado = invoice.invoiceNumber ? PurchaseInvoiceStatus.confirmed : PurchaseInvoiceStatus.received;
      return tx.purchaseInvoice.update({ where: { id: invoice.id }, data: { status: nuevoEstado }, include: { supplier: true, lines: true, warehouse: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /**
   * Completa los datos fiscales de una factura que se cargó como "recibido,
   * factura pendiente": no vuelve a mover stock ni a tocar la cuenta corriente
   * (esa deuda ya se registró al recibir la mercadería) — sólo pone el número
   * real de la factura del proveedor.
   */
  async completeInvoice(tenantId: string, invoiceId: string, body: Record<string, unknown>) {
    const invoice = await this.prisma.purchaseInvoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (invoice.status !== PurchaseInvoiceStatus.received) throw new ConflictException('Esta factura no está pendiente de completar');
    const invoiceType = typeof body.invoiceType === 'string' ? body.invoiceType as PurchaseInvoiceType : invoice.invoiceType;
    if (!Object.values(PurchaseInvoiceType).includes(invoiceType)) throw new UnprocessableEntityException('invoiceType no es válido');
    const pointOfSale = typeof body.pointOfSale === 'string' ? body.pointOfSale.trim() : '';
    const invoiceNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : '';
    if (!pointOfSale || !invoiceNumber) throw new UnprocessableEntityException('pointOfSale e invoiceNumber son obligatorios para completar la factura');
    const dueDate = body.dueDate ? new Date(String(body.dueDate)) : invoice.dueDate;
    if (dueDate && Number.isNaN(dueDate.getTime())) throw new UnprocessableEntityException('La fecha de vencimiento no es válida');
    try {
      return await this.prisma.purchaseInvoice.update({
        where: { id: invoiceId },
        data: { invoiceType, pointOfSale, invoiceNumber, dueDate, status: PurchaseInvoiceStatus.confirmed },
        include: { supplier: true, lines: true, warehouse: true },
      });
    } catch (error) { if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ya existe una factura con ese tipo, punto de venta y número'); throw error; }
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
    const lines: Array<{ productId: string; productLotId?: string; barcode: string; description: string; quantity: number; unitFactor: number; unitCost: number; discountPercent: number; taxRate: number; lineSubtotal: number; lineTax: number; lineTotal: number }> = [];
    for (const raw of rawLines) {
      const productId = typeof raw.productId === 'string' ? raw.productId : '';
      const barcode = typeof raw.barcode === 'string' ? raw.barcode.trim() : '';
      const { product, scannedPack } = await this.resolveLineProduct(user.tenantId, { productId: productId || undefined, barcode });
      if (!product) throw new UnprocessableEntityException(`No existe el producto ${barcode || productId || '(vacío)'}`);
      if (await this.esKit(user.tenantId, product.id)) throw new UnprocessableEntityException(`${product.name} es un combo armado con otros productos; no se compra directo, se arma solo con el stock de sus componentes`);
      const quantity = this.money(raw.quantity, 'quantity'); const unitCost = this.money(raw.unitCost, 'unitCost'); const discountPercent = this.percent(raw.discountPercent, 'discountPercent'); const taxRate = this.money(raw.taxRate ?? 0, 'taxRate');
      if (quantity <= 0) throw new UnprocessableEntityException('quantity debe ser mayor a cero');
      const productLotId = typeof raw.productLotId === 'string' && raw.productLotId ? raw.productLotId : undefined;
      if (product.manejaVencimiento && !productLotId) throw new UnprocessableEntityException(`El producto ${product.name} requiere lote`);
      if (productLotId && !(await this.prisma.productLot.findFirst({ where: { id: productLotId, tenantId: user.tenantId, productId: product.id } }))) throw new UnprocessableEntityException('El lote no corresponde al producto');
      // rawLines puede venir del cliente (trae byPackage) o ser las lineas ya
      // guardadas de la factura (traen unitFactor); en ese caso se preserva.
      const stored = 'unitFactor' in raw && raw.unitFactor !== undefined && raw.unitFactor !== null ? Number(raw.unitFactor) : null;
      const byPackage = ('byPackage' in raw && raw.byPackage === true) || scannedPack;
      const unitFactor = stored ?? (byPackage ? Number(product.unitsPerPurchase) : 1);
      const netUnitCost = unitCost * (1 - discountPercent / 100);
      const lineSubtotal = Number((quantity * netUnitCost).toFixed(2)); const lineTax = Number((lineSubtotal * taxRate / 100).toFixed(2));
      lines.push({ productId: product.id, productLotId, barcode: product.barcode, description: product.name, quantity, unitFactor, unitCost, discountPercent, taxRate, lineSubtotal, lineTax, lineTotal: Number((lineSubtotal + lineTax).toFixed(2)) });
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
      // La cuenta corriente ya tenía el total viejo cargado (al recibir o al
      // confirmar); acá sólo se ajusta la diferencia, no se vuelve a cargar
      // todo. Si además cambió de proveedor, se revierte entero del viejo y
      // se carga entero en el nuevo — un delta no tendría a quién aplicarse.
      if (supplierId !== current.supplierId) {
        await registrarMovimientoCuentaProveedor(tx, user.tenantId, current.supplierId, -Number(current.total), {
          type: 'adjustment', purchaseInvoiceId: invoiceId, userId: user.id, notes: `Corrección: ${reason} (pasó a otro proveedor)`,
        });
        await registrarMovimientoCuentaProveedor(tx, user.tenantId, supplierId, total, {
          type: 'adjustment', purchaseInvoiceId: invoiceId, userId: user.id, notes: `Corrección: ${reason} (venía de otro proveedor)`,
        });
      } else {
        const delta = Math.round((total - Number(current.total)) * 100) / 100;
        if (delta !== 0) {
          await registrarMovimientoCuentaProveedor(tx, user.tenantId, supplierId, delta, {
            type: 'adjustment', purchaseInvoiceId: invoiceId, userId: user.id, notes: `Corrección: ${reason}`,
          });
        }
      }
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
      // Se anula la deuda que había generado esta factura, tenga o no ya
      // número fiscal.
      await registrarMovimientoCuentaProveedor(tx, user.tenantId, invoice.supplierId, -Number(invoice.total), {
        type: 'adjustment', purchaseInvoiceId: invoiceId, userId: user.id, notes: `Anulación: ${reason}`,
      });
      return tx.purchaseInvoice.update({ where: { id: invoiceId }, data: { status: PurchaseInvoiceStatus.cancelled }, include: { supplier: true, lines: true, warehouse: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /** El `where` que arma la lista y el export: mismo filtro, una sola vez. */
  private whereDe(tenantId: string, warehouseIds: string[] | undefined, query: Record<string, string | undefined>): Prisma.PurchaseInvoiceWhereInput {
    const search = query.search?.trim();
    return {
      tenantId,
      ...(warehouseIds ? { warehouseId: { in: warehouseIds } } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.status ? { status: query.status as PurchaseInvoiceStatus } : {}),
      ...(query.from || query.to
        ? { issueDate: { gte: query.from ? new Date(`${query.from}T00:00:00`) : undefined, lte: query.to ? new Date(`${query.to}T23:59:59.999`) : undefined } }
        : {}),
      ...(search
        ? { OR: [{ invoiceNumber: { contains: search, mode: 'insensitive' } }, { pointOfSale: { contains: search, mode: 'insensitive' } }] }
        : {}),
    };
  }

  async list(tenantId: string, warehouseIds: string[] | undefined, query: Record<string, string | undefined> = {}) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(query.pageSize ?? '20', 10) || 20));
    const where = this.whereDe(tenantId, warehouseIds, query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchaseInvoice.findMany({
        where, include: { supplier: { select: { name: true } }, warehouse: { select: { name: true } }, lines: true },
        orderBy: { issueDate: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      }),
      this.prisma.purchaseInvoice.count({ where }),
    ]);
    return { items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  /** Todas las filas del filtro activo, sin paginar — para el Excel. */
  exportRows(tenantId: string, warehouseIds: string[] | undefined, query: Record<string, string | undefined>) {
    return this.prisma.purchaseInvoice.findMany({
      where: this.whereDe(tenantId, warehouseIds, query),
      include: { supplier: { select: { name: true } } },
      orderBy: { issueDate: 'desc' },
      take: 10000,
    });
  }
}
