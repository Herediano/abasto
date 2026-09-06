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

export async function uploadFile<T>(path: string, token: string, file: File, fields: Record<string, string> = {}): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);
  const response = await fetch(`${API}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, ...branchHeaders() }, body: formData });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export async function downloadFile(path: string, token: string, filename: string) {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, ...branchHeaders() } });
  if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => ({})));
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
  tenant: { id: string; name: string; logo?: string | null; timezone?: string };
};

export type Permission = { key: string; area: string; label: string; dangerous: boolean };

export type Rango = { id: string; name: string; isSystem: boolean; userCount: number; permissions: string[] };

export type Product = {
  id: string;
  name: string;
  barcode: string;
  internalCode?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  unit: string;
  purchaseUnit?: string | null;
  unitsPerPurchase?: string | null;
  brand?: string | null;
  costPrice?: string | null;
  salePrice?: string | null;
  taxRate: string;
  internalTaxRate?: string | null;
  minStock?: string | null;
  manejaVencimiento: boolean;
  isWeighed: boolean;
  isActive: boolean;
  currentStock?: number;
  // Sólo vienen en el detalle (GET /products/:id), no en el listado.
  extraBarcodes?: ProductBarcode[];
  suppliers?: ProductSupplierLink[];
  priceHistory?: PriceHistoryRow[];
};

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
};

export type LowStockProduct = Product & { currentStock: number };

export type Category = { id: string; name: string; productCount?: number };

export type PriceList = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  derivesFromId?: string | null;
  derivesFromName?: string | null;
  markupPercent?: string | null;
  priceCount?: number;
};

export type PriceRule = {
  id: string;
  name: string;
  priceListId: string;
  priceListName?: string;
  target: 'salePrice' | 'costPrice';
  scopeType: 'all' | 'category' | 'brand';
  scopeValue?: string | null;
  operationType: 'percent' | 'margin' | 'round';
  operationValue?: string | null;
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
};

export type Customer = {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
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
  countedCash?: string | null;
  cashDifference?: string | null;
  closingNotes?: string | null;
  cashRegister?: { id: string; name: string; warehouseId: string };
  cashRegisterName?: string;
  openedByName?: string;
  closedByName?: string | null;
  salesCount?: number;
  totalsByMethod?: { method: string; total: number }[];
  movements?: CashMovement[];
};

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'qr' | 'account';

export type SalePayment = { method: PaymentMethod; amount: string; reference?: string | null };

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

export type Warehouse = { id: string; name: string; code: string; address?: string | null; branchId?: string; branch?: { id: string; name: string } | null };

export type Supplier = {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
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
  notes?: string | null;
  referenceType?: string | null;
};

export type PurchaseInvoice = {
  id: string;
  supplierId: string;
  invoiceType: string;
  pointOfSale: string;
  invoiceNumber: string;
  issueDate: string;
  status: string;
  subtotal: string;
  taxTotal: string;
  otherTaxes?: Array<{ label: string; amount: number }> | null;
  otherTaxesTotal?: string;
  total: string;
  notes?: string | null;
  supplier?: { name: string };
  lines: Array<{ productId: string; productLotId?: string | null; barcode: string; description?: string | null; quantity: string; unitFactor?: string; unitCost: string; taxRate: string }>;
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
