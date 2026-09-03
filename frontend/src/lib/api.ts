const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export async function uploadFile<T>(path: string, token: string, file: File, fields: Record<string, string> = {}): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);
  const response = await fetch(`${API}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export async function downloadFile(path: string, token: string, filename: string) {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
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

export type Session = {
  accessToken: string;
  expiresIn: number;
  user: { id: string; name: string; email: string; role?: 'admin' | 'user'; warehouseId?: string | null };
  tenant: { id: string; name: string };
};

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

export type Warehouse = { id: string; name: string; code: string; address?: string | null };

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

export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  warehouseId?: string | null;
  warehouse?: { name: string } | null;
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
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
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
