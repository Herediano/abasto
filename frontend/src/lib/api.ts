export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

/**
 * Header de la sucursal activa. Se lee de localStorage sin pasar por el
 * auth-context para no armar un ciclo de imports. Sólo se manda si la
 * sucursal guardada es la de la cuenta activa.
 */
function branchHeaders(): Record<string, string> {
  try {
    const activeUserId = localStorage.getItem('abasto-active');
    const raw = localStorage.getItem('abasto-branch');
    if (!activeUserId || !raw) return {};
    const b = JSON.parse(raw) as { userId?: string; branchId?: string };
    return b.userId === activeUserId && b.branchId ? { 'X-Branch': b.branchId } : {};
  } catch {
    return {};
  }
}

/**
 * El backend rechazó el token (401): venció (dura 8 h) o dejó de valer. El
 * auth-context registra acá qué hacer —cerrar la cuenta activa—; se llama una
 * sola vez aunque varios pedidos vuelvan 401 a la vez. Vive como callback y no
 * como import para no armar un ciclo con auth-context.
 */
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}
let lastUnauthorizedAt = 0;
function onUnauthorized() {
  const now = Date.now();
  if (now - lastUnauthorizedAt < 3000) return;
  lastUnauthorizedAt = now;
  unauthorizedHandler?.();
}

export async function uploadFile<T>(path: string, token: string, file: File, fields: Record<string, string> = {}): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);
  const response = await fetch(`${API}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, ...branchHeaders() }, body: formData });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) onUnauthorized();
    throw new ApiError(response.status, data);
  }
  return data as T;
}

/** El cuerpo crudo de un endpoint de exportación (CSV), con el header de la
 *  sucursal activa igual que `downloadFile` — para copiar la tabla al portapapeles. */
export async function exportText(path: string, token: string): Promise<string> {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, ...branchHeaders() } });
  if (!response.ok) {
    if (response.status === 401) onUnauthorized();
    throw new ApiError(response.status, await response.json().catch(() => ({})));
  }
  return response.text();
}

export async function downloadFile(path: string, token: string, filename: string) {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, ...branchHeaders() } });
  if (!response.ok) {
    if (response.status === 401) onUnauthorized();
    throw new ApiError(response.status, await response.json().catch(() => ({})));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type UserPreferences = {
  /** Color del avatar (uno de los presets de Ajustes). */
  avatarColor?: string;
  /** Foto de perfil como data URI (la achica el frontend a 128 px). */
  avatar?: string | null;
};

export type Session = {
  accessToken: string;
  user: {
    id: string; name: string; email: string;
    rangoId?: string; rangoName?: string; permissions?: string[];
    warehouseId?: string | null; preferences?: UserPreferences;
    /** La sucursal activa: la propia, o la que se está mirando con `sucursales.navegar`. */
    branch?: { id: string; name: string } | null;
    /** La sucursal propia del usuario (la que deriva de su depósito). */
    homeBranch?: { id: string; name: string } | null;
    /** ¿Puede mirar otras sucursales además de la suya? */
    canNavigateBranches?: boolean;
  };
  tenant: { id: string; name: string; logo?: string | null; timezone?: string; autoUpdateCostOnPurchase?: boolean; plantilla?: string; condicionFiscal?: string };
};

export type Permission = { key: string; area: string; label: string; dangerous: boolean };

export type Rango = { id: string; name: string; isSystem: boolean; userCount: number; permissions: string[] };

export type Product = {
  id: string;
  name: string;
  barcode: string;
  sku?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  unit: string;
  purchaseUnit?: string | null;
  unitsPerPurchase?: string | null;
  packBarcode?: string | null;
  brand?: string | null;
  costPrice?: string | null;
  salePrice?: string | null;
  ivaSituacion: string;
  taxRate: string;
  internalTaxRate?: string | null;
  // Reposición: ya resueltos para la sucursal activa en el listado; el valor
  // general del producto en el detalle.
  minStock?: string | null;
  maxStock?: string | null;
  manejaVencimiento: boolean;
  isWeighed: boolean;
  isActive: boolean;
  currentStock?: number;
  // Sólo vienen en el detalle (GET /products/:id), no en el listado.
  extraBarcodes?: ProductBarcode[];
  suppliers?: ProductSupplierLink[];
  priceHistory?: PriceHistoryRow[];
  stockRules?: ProductStockRule[];
  components?: ProductComponentLink[];
  /** Ya es ingrediente de otro combo — no puede tener sus propios componentes. */
  isComponentOfKit?: boolean;
  activeBranchId?: string | null;
};

export type ProductComponentLink = {
  id: string;
  componentProductId: string;
  componentName: string;
  componentBarcode: string;
  componentCostPrice?: string | null;
  quantity: string;
};

export type ProductStockRule = {
  branchId: string;
  branchName: string;
  minStock: string | null;
  maxStock: string | null;
};

// --- Importador de Excel ---
export type ImportField = { key: string; label: string; kind: string; matchKey?: boolean; requiredForCreate?: boolean; help?: string };
export type ImportInspect = { headers: string[]; rowCount: number; suggested: Record<string, number>; sampleRows: string[][] };
export type ImportError = { row: number; message: string };
export type ImportPreview = {
  willCreate: number; willUpdate: number; skipped: number;
  errors: ImportError[];
  sample: { barcode: string; action: string; campos: string[] }[];
};
export type ImportApplyResult = { created: number; updated: number; skipped: number; errors: ImportError[] };

export type PriceHistoryRow = {
  id: string;
  field: 'cost' | 'sale';
  oldValue?: string | null;
  newValue: string;
  source: 'manual' | 'import' | 'bulk' | 'invoice';
  createdAt: string;
};

export type ProductBarcode = { id: string; barcode: string };

export type ProductSupplierLink = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCode?: string | null;
  lastCost?: string | null;
  lastPurchaseAt?: string | null;
  /** El proveedor por defecto del producto: a quien se le pide al reponer. */
  isPreferred?: boolean;
};

export type LowStockProduct = Product & {
  currentStock: number;
  /** Cuánto pedir para volver al máximo (redondeado al bulto). null si no hay "reponer hasta". */
  suggestedOrder: number | null;
  /** true si la sucursal activa tiene su propio mín/máx. */
  branchOverride?: boolean;
  /** Proveedor preferido del producto: a quién pedirle. */
  preferredSupplierId?: string | null;
  preferredSupplierName?: string | null;
  preferredSupplierCode?: string | null;
};

export type Category = { id: string; name: string; productCount?: number; targetMargin?: number | null };

export type PriceList = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  /** null = general: rige en toda la empresa. Con sucursal, sólo ahí. */
  branchId?: string | null;
  branchName?: string | null;
  derivesFromId?: string | null;
  derivesFromName?: string | null;
  markupPercent?: string | null;
  /** Productos con precio propio vigente en esta lista. */
  pricedProducts?: number;
  /** Productos con un cambio de precio cargado a futuro. */
  scheduledProducts?: number;
  lastChangeAt?: string | null;
  /** Clientes a los que se les cobra con esta lista. */
  customerCount?: number;
  /** Productos activos del catálogo, para leer la cobertura como "X de Y". */
  totalProducts?: number;
};

/** Qué cobra una lista, producto por producto (`GET /price-lists/:id`). */
export type PriceListDetail = {
  list: PriceList;
  items: Array<{
    id: string;
    name: string;
    sku?: string | null;
    barcode: string;
    cost: number | null;
    price: number | null;
    margin: number | null;
    /** true = precio cargado en esta lista; false = le llega calculado de la lista de la que deriva. */
    explicit: boolean;
  }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

/**
 * Los filtros de una actualización masiva. Todos los presentes se combinan con
 * AND, igual que los filtros de un listado: cada uno recorta el conjunto. Sin
 * ninguno = todos los productos activos.
 */
export type PriceSelection = {
  categoryIds?: string[];
  brands?: string[];
  supplierIds?: string[];
  productIds?: string[];
  excludeIds?: string[];
  search?: string;
  missing?: 'sale' | 'cost';
  marginMin?: number;
  marginMax?: number;
  belowCategoryMargin?: boolean;
  priceMin?: number;
  priceMax?: number;
  staleDays?: number;
};

export type PriceTarget = 'salePrice' | 'costPrice';
export type PriceOperationType = 'percent' | 'margin' | 'round' | 'supplierIncrease' | 'tier';
export type PriceRounding = 'nearest10' | 'nearest100' | 'ending99' | 'byRules';

/** Contador en vivo: cuántos productos entran en la selección, con una muestra. */
export type SelectionCount = {
  total: number;
  sample: Array<{ id: string; name: string; cost: number | null; sale: number | null; margin: number | null }>;
  priceList: { id: string; name: string };
};

export type BulkPreviewRow = {
  id: string;
  name: string;
  costBefore: number | null;
  costAfter: number | null;
  saleBefore: number | null;
  saleAfter: number | null;
  marginBefore: number | null;
  marginAfter: number | null;
};

export type BulkResult = {
  affected: number;
  selected: number;
  skipped: number;
  skippedDetail: Array<{ id: string; name: string; reason: string }>;
  preview: BulkPreviewRow[];
  priceList: { id: string; name: string };
  writes: { cost: boolean; sale: boolean };
  scheduled: boolean;
  validFrom: string;
  applied: boolean;
};

export type PriceRule = {
  id: string;
  name: string;
  priceListId: string;
  priceListName?: string;
  target: PriceTarget;
  /** Alcance viejo de un solo eje. Las reglas nuevas traen `selection`. */
  scopeType?: 'all' | 'category' | 'brand' | 'ids' | null;
  scopeValue?: string | null;
  selection: PriceSelection;
  /** Texto en criollo de la selección, armado por el backend. */
  selectionLabel: string;
  operationType: PriceOperationType;
  /** null = el criterio guarda a quién, y el porcentaje se pide al ejecutarlo. */
  operationValue?: string | null;
  /** Sólo con operationType "margin": ignora operationValue y usa el margen de la categoría de cada producto. */
  useCategoryMargin: boolean;
  /** Sólo con operationType "tier": desde qué cantidad rige el precio por cantidad. */
  tierMinQty?: string | null;
  needsValue: boolean;
  rounding?: string | null;
  lastRunAt?: string | null;
};

export type RoundingRule = { id: string; fromAmount: string; toAmount?: string | null; mode: string };

export type ScheduledChange = { priceListId: string; priceListName: string; validFrom: string; products: number; source: string };

export type Promotion = {
  id: string;
  name: string;
  type: 'nxm' | 'a_plus_b' | 'percent' | 'amount' | 'special_price';
  config: Record<string, number>;
  scopeType: 'all' | 'category' | 'brand';
  scopeValue?: string | null;
  validFrom: string;
  validTo?: string | null;
  isActive: boolean;
  priority: number;
  exclusive: boolean;
  /** Días de la semana en que corre (0=domingo…6=sábado). Vacío = todos los días. */
  daysOfWeek: number[];
  /** Franja horaria "HH:mm". null en cualquiera de los dos = todo el día. */
  startTime: string | null;
  endTime: string | null;
};

/** Resultado de simular una promo sobre un precio y una cantidad de ejemplo. */
export type PromoPreview = {
  quantity: number;
  unitPrice: number;
  bruto: number;
  discountAmount: number;
  total: number;
  unitPriceEfectivo: number;
  aplica: boolean;
};

export type Customer = {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  condicionFiscal?: string;
  priceListId?: string | null;
  priceListName?: string | null;
  creditLimit?: string | null;
  accountBalance?: string;
  isActive: boolean;
};

export type CashRegister = { id: string; name: string; warehouseId: string };

export type CashMovement = {
  id: string;
  type: 'deposit' | 'withdrawal' | 'expense';
  amount: string;
  reason: string;
  /** Desglose por billete (denominación → cantidad), sólo si se contó billete por billete. */
  denominations?: Record<string, number> | null;
  occurredAt: string;
  userName?: string;
};

export type CashShift = {
  id: string;
  cashRegisterId: string;
  status: 'open' | 'closed';
  openingCash: string;
  openingNotes?: string | null;
  openedAt: string;
  closedAt?: string | null;
  expectedCash?: string | null;
  /** Cuánto debería haber en el cajón ahora mismo, sin cerrar el turno (para el reporte X). */
  expectedCashNow?: string | null;
  countedCash?: string | null;
  /** Desglose del arqueo por billete (denominación → cantidad), sólo si se contó billete por billete. */
  cashCount?: Record<string, number> | null;
  cashDifference?: string | null;
  closingNotes?: string | null;
  cashRegister?: { id: string; name: string; warehouseId: string; warehouse?: { name: string; branch: { name: string } } };
  cashRegisterName?: string;
  openedByName?: string;
  closedByName?: string | null;
  salesCount?: number;
  saleTotals?: { subtotal: number; taxTotal: number; surchargeTotal: number; total: number };
  totalsByMethod?: { method: string; total: number; count?: number }[];
  /** Sólo pagos en card_credit con una tarjeta puntual elegida de la lista. */
  totalsByCard?: { cardId: string; name: string; total: number; count: number }[];
  movements?: CashMovement[];
};

/** 'card' queda sólo por compatibilidad con ventas históricas; las nuevas usan card_debit/card_credit. */
export type PaymentMethod = 'cash' | 'card' | 'card_debit' | 'card_credit' | 'transfer' | 'qr' | 'account';

export type PaymentAdjustment = { method: PaymentMethod; percent: number };

export type PaymentCardInstallment = { id: string; installments: number; surchargePercent: string };
export type PaymentCard = { id: string; name: string; isActive: boolean; installmentOptions: PaymentCardInstallment[] };

export type SalePayment = { method: PaymentMethod; amount: string; surchargeAmount?: string; reference?: string | null; cardId?: string | null; installments?: number | null };

export type CustomerAccountMovement = {
  id: string;
  type: 'sale' | 'payment' | 'adjustment';
  amount: string;
  balanceAfter: string;
  notes?: string | null;
  occurredAt: string;
  userName?: string;
  saleId?: string | null;
};

export type CustomerAccount = {
  customerId: string;
  customerName: string;
  balance: number;
  creditLimit: number | null;
  available: number | null;
  movements: CustomerAccountMovement[];
};

export type PriceTier = { id: string; priceListId: string; priceListName: string; minQty: string; price: string };

export type TierBulkResult = {
  affected: number;
  selected: number;
  skipped: number;
  skippedDetail: Array<{ id: string; name: string; reason: string }>;
  preview: Array<{ id: string; name: string; salePrice: number; tierBefore: number | null; tierAfter: number }>;
  priceList: { id: string; name: string };
  minQty: number;
  discountPercent: number;
  applied: boolean;
};

export type PendingCost = {
  productId: string;
  productName: string;
  currentCost: number | null;
  lastCost: number;
  supplierId: string;
  supplierName: string;
  lastPurchaseAt: string | null;
};

export type PriceAuditRow = {
  id: string;
  at: string;
  productId: string;
  productName: string;
  field: 'sale' | 'cost';
  scope?: string | null;
  before: number | null;
  after: number;
  source: string;
  userName?: string | null;
  validFrom: string;
};

export type Branch = {
  id: string; name: string; code: string; address?: string | null; isActive?: boolean;
  _count?: { warehouses: number; users?: number };
  /** Sólo en `/branches?includeInactive=1` (Ajustes): si se puede eliminar / desactivar. */
  canDelete?: boolean;
  canDeactivate?: boolean;
};

export type Warehouse = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  branchId?: string;
  branch?: { id: string; name: string } | null;
  isActive?: boolean;
  canDeactivate?: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  accountBalance?: string | number;
  isActive?: boolean;
};

export type Lot = {
  id: string;
  lotNumber: string;
  expirationDate?: string | null;
  warehouseId?: string;
  supplierId?: string | null;
  receivedAt?: string | null;
};

export type StockItem = {
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  productLotId?: string | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
  supplierName?: string | null;
  quantity: string;
};

export type Movement = {
  id: string;
  productId: string;
  productName: string;
  productBarcode: string;
  productLotId?: string | null;
  warehouseId: string;
  quantity: string;
  movementType: string;
  lotNumber?: string | null;
  expirationDate?: string | null;
  warehouseName: string;
  occurredAt: string;
  reason?: string | null;
  notes?: string | null;
  referenceType?: string | null;
};

export type PurchaseInvoice = {
  id: string;
  supplierId: string;
  invoiceType: string;
  pointOfSale: string | null;
  invoiceNumber: string | null;
  remitoNumber?: string | null;
  dueDate?: string | null;
  issueDate: string;
  status: 'draft' | 'received' | 'confirmed' | 'corrected' | 'cancelled' | string;
  subtotal: string;
  taxTotal: string;
  otherTaxes?: Array<{ label: string; amount: number }> | null;
  otherTaxesTotal?: string;
  total: string;
  notes?: string | null;
  supplier?: { name: string };
  lines: Array<{ id: string; productId: string; productLotId?: string | null; barcode: string; description?: string | null; quantity: string; unitFactor?: string; unitCost: string; discountPercent?: string; taxRate: string }>;
};

export type SupplierAccountMovement = {
  id: string;
  type: 'invoice' | 'payment' | 'adjustment';
  amount: string;
  balanceAfter: string;
  notes?: string | null;
  occurredAt: string;
  userName?: string;
  comprobante?: string | null;
  /** Si el ajuste vino de una SupplierNote estructurada, qué tipo era. */
  noteKind?: SupplierNoteKind | null;
};

export type SupplierNoteKind = 'credit_note' | 'debit_note';

export type SupplierNoteLine = {
  id: string;
  purchaseInvoiceId: string;
  purchaseInvoiceLineId?: string | null;
  productId?: string | null;
  productLotId?: string | null;
  description: string;
  returnsStock: boolean;
  quantity?: string | null;
  unitAmount?: string | null;
  taxRate: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
};

export type SupplierNote = {
  id: string;
  supplierId: string;
  kind: SupplierNoteKind;
  reason: string;
  supplierDocType?: string | null;
  supplierPointOfSale?: string | null;
  supplierNumber?: string | null;
  supplierIssueDate?: string | null;
  supplierComprobante?: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  occurredAt: string;
  userName?: string;
  lines: SupplierNoteLine[];
};

export type SupplierAccount = {
  supplierId: string;
  supplierName: string;
  balance: number;
  movements: SupplierAccountMovement[];
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  warehouseId: string;
  status: 'open' | 'received' | 'cancelled';
  notes?: string | null;
  createdAt: string;
  supplier?: { name: string };
  createdBy?: { name: string };
  lines: Array<{ id: string; productId: string; quantity: string; product?: { name: string; barcode: string } }>;
};

export type Sale = {
  id: string;
  docType: string;
  pointOfSale: string;
  number: number;
  customerId?: string | null;
  customerName?: string | null;
  userName?: string;
  paymentMethod: string;
  status: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  /** Recargo/descuento por medio de pago. Lo que se cobró es total + surchargeTotal. */
  surchargeTotal?: string;
  /** null = sin autorizar todavía por ARCA (hoy siempre, ver fiscal.util.ts en el backend). */
  cae?: string | null;
  caeExpiresAt?: string | null;
  occurredAt: string;
  lineCount?: number;
};

export type SaleLine = {
  id: string;
  productId: string;
  description: string;
  quantity: string;
  listPrice: string;
  unitPrice: string;
  discountAmount: string;
  promotionName?: string | null;
  lineTotal: string;
};

export type SaleDetail = Sale & { lines: SaleLine[]; payments: SalePayment[]; warehouseName: string; cancelReason?: string | null };

export type CreditNoteLine = {
  id: string;
  saleLineId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
};
export type CreditNote = {
  id: string;
  comprobante: string;
  saleComprobante?: string;
  reason: string;
  refundMethod: 'cash' | 'account';
  subtotal: string;
  taxTotal: string;
  total: string;
  occurredAt: string;
  lines: CreditNoteLine[];
};

export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  rangoId: string;
  rangoName: string;
  isActive: boolean;
  branchId?: string | null;
  branch?: { name: string } | null;
};

export class ApiError extends Error {
  status: number;
  data: { message?: string; available?: string; requested?: string; code?: string };
  constructor(status: number, data: ApiError['data']) {
    super(data.message ?? 'No se pudo completar la operación');
    this.status = status;
    this.data = data;
  }
}

export async function api<T>(path: string, options: RequestInit = {}, token = ''): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...branchHeaders(), ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) onUnauthorized();
    throw new ApiError(response.status, data);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.data.code === 'INSUFFICIENT_STOCK') return `${error.data.message}. Disponible: ${error.data.available ?? '0'} · Solicitado: ${error.data.requested ?? ''}`;
    return error.message;
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}
