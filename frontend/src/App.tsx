import { FormEvent, useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
type Tenant = { id: string; name: string };
type Product = { id: string; name: string; sku: string; manejaVencimiento: boolean };
type Warehouse = { id: string; name: string; code: string };
type Lot = { id: string; lotNumber: string; expirationDate?: string | null };
type StockItem = { productId: string; productName: string; warehouseId: string; warehouseName: string; productLotId?: string | null; lotNumber?: string | null; expirationDate?: string | null; quantity: string };
type Movement = { id: string; quantity: string; movementType: string; lotNumber?: string | null; warehouseName: string; occurredAt: string; notes?: string | null };

async function api<T>(path: string, options: RequestInit = {}, tenantId = '') {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(tenantId ? { 'x-tenant-id': tenantId } : {}), ...options.headers } });
  if (!response.ok) { const data = await response.json().catch(() => ({})); const error = new Error(data.message ?? 'No se pudo completar la operación'); (error as Error & { status?: number; data?: unknown }).status = response.status; (error as Error & { data?: unknown }).data = data; throw error; }
  return response.json() as Promise<T>;
}

function App() {
  const [path, setPath] = useState(window.location.pathname || '/');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState(localStorage.getItem('smart-erp-tenant') ?? '');
  const [error, setError] = useState('');
  useEffect(() => { api<Tenant[]>('/tenants').then(data => { setTenants(data); if (!data.some(t => t.id === tenantId)) setTenantId(data[0]?.id ?? ''); }).catch(e => setError(e.message)); }, []);
  useEffect(() => { if (tenantId) localStorage.setItem('smart-erp-tenant', tenantId); }, [tenantId]);
  function navigate(next: string) { window.history.pushState({}, '', next); setPath(next); setError(''); }
  useEffect(() => { const onPop = () => setPath(window.location.pathname); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  const selected = tenants.find(t => t.id === tenantId);
  return <div className="shell"><header><strong>Smart ERP</strong><label>Tenant <select value={tenantId} onChange={e => setTenantId(e.target.value)}><option value="">Seleccionar...</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label></header><nav><button className={path === '/' ? 'active' : ''} onClick={() => navigate('/')}>Stock actual</button><button className={path === '/stock/in' ? 'active' : ''} onClick={() => navigate('/stock/in')}>Ingreso</button><button className={path === '/stock/out' ? 'active' : ''} onClick={() => navigate('/stock/out')}>Egreso</button><button className={path === '/stock/history' ? 'active' : ''} onClick={() => navigate('/stock/history')}>Historial</button></nav><main>{error && <div className="alert">{error}<button onClick={() => setError('')}>×</button></div>}{!tenantId ? <section className="card"><h1>Seleccioná un tenant</h1><p>Elegí una empresa arriba para comenzar.</p></section> : path === '/stock/in' ? <MovementForm tenantId={tenantId} direction="in" onDone={() => navigate('/')} onError={setError} /> : path === '/stock/out' ? <MovementForm tenantId={tenantId} direction="out" onDone={() => navigate('/')} onError={setError} /> : path === '/stock/history' ? <History tenantId={tenantId} onError={setError} /> : <Stock tenantId={tenantId} onError={setError} />}</main><footer>{selected?.name ?? 'Sin tenant'} · API local</footer></div>;
}

function Stock({ tenantId, onError }: { tenantId: string; onError: (message: string) => void }) {
  const [items, setItems] = useState<StockItem[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); api<{ items: StockItem[] }>('/stock', {}, tenantId).then(r => setItems(r.items)).catch(e => onError(e.message)).finally(() => setLoading(false)); }, [tenantId]);
  return <section><h1>Stock actual</h1><p>Existencias por depósito y lote.</p><div className="card">{loading ? <p>Cargando...</p> : items.length === 0 ? <p>No hay stock registrado.</p> : <table><thead><tr><th>Producto</th><th>Depósito</th><th>Lote</th><th>Vencimiento</th><th>Stock</th></tr></thead><tbody>{items.map(i => <tr key={`${i.productId}-${i.warehouseId}-${i.productLotId}`}><td>{i.productName}</td><td>{i.warehouseName}</td><td>{i.lotNumber ?? 'Sin lote'}</td><td>{i.expirationDate ? i.expirationDate.slice(0, 10) : '—'}</td><td><strong>{i.quantity}</strong></td></tr>)}</tbody></table>}</div></section>;
}

function MovementForm({ tenantId, direction, onDone, onError }: { tenantId: string; direction: 'in' | 'out'; onDone: () => void; onError: (message: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]); const [warehouses, setWarehouses] = useState<Warehouse[]>([]); const [lots, setLots] = useState<Lot[]>([]); const [saving, setSaving] = useState(false); const [productId, setProductId] = useState(''); const [productLotId, setProductLotId] = useState(''); const [form, setForm] = useState({ warehouseId: '', quantity: '', movementType: direction === 'in' ? 'purchase_in' : 'sale_out', notes: '' });
  const product = products.find(p => p.id === productId);
  useEffect(() => { Promise.all([api<Product[]>('/products', {}, tenantId), api<Warehouse[]>('/warehouses', {}, tenantId)]).then(([p, w]) => { setProducts(p); setWarehouses(w); setProductId(p[0]?.id ?? ''); setForm(f => ({ ...f, warehouseId: w[0]?.id ?? '' })); }).catch(e => onError(e.message)); }, [tenantId]);
  useEffect(() => { if (productId) api<Lot[]>(`/products/${productId}/lots`, {}, tenantId).then(setLots).catch(e => onError(e.message)); else setLots([]); setProductLotId(''); }, [productId, tenantId]);
  const types = direction === 'in' ? [['purchase_in', 'Compra'], ['transfer_in', 'Transferencia entrante'], ['adjustment_in', 'Ajuste positivo']] : [['sale_out', 'Venta'], ['transfer_out', 'Transferencia saliente'], ['adjustment_out', 'Ajuste negativo']];
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); onError(''); try { await api(`/stock/${direction}`, { method: 'POST', body: JSON.stringify({ productId, productLotId: productLotId || undefined, warehouseId: form.warehouseId, quantity: Number(form.quantity), movementType: form.movementType, notes: form.notes || undefined }) }, tenantId); onDone(); } catch (e) { const err = e as Error & { status?: number; data?: { available?: string; requested?: string } }; onError(err.status === 409 ? `${err.message}. Disponible: ${err.data?.available ?? '0'} · Solicitado: ${err.data?.requested ?? form.quantity}` : err.message); } finally { setSaving(false); } }
  return <section><h1>{direction === 'in' ? 'Registrar ingreso' : 'Registrar egreso'}</h1><form className="card form" onSubmit={submit}><label>Producto<select required value={productId} onChange={e => setProductId(e.target.value)}>{products.map(p => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></label><label>Depósito<select required value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>Lote {product?.manejaVencimiento ? '(obligatorio)' : '(opcional)'}<select value={productLotId} required={!!product?.manejaVencimiento} onChange={e => setProductLotId(e.target.value)}><option value="">{product?.manejaVencimiento ? 'Seleccionar lote...' : 'Sin lote'}</option>{lots.map(l => <option key={l.id} value={l.id}>{l.lotNumber}{l.expirationDate ? ` · vence ${l.expirationDate.slice(0, 10)}` : ''}</option>)}</select></label><label>Cantidad<input required min="0.001" step="0.001" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label><label>Tipo<select value={form.movementType} onChange={e => setForm({ ...form, movementType: e.target.value })}>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Notas<textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label><button className="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar movimiento'}</button></form></section>;
}

function History({ tenantId, onError }: { tenantId: string; onError: (message: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]); const [productId, setProductId] = useState(''); const [items, setItems] = useState<Movement[]>([]); const [page, setPage] = useState(1); const [pagination, setPagination] = useState({ total: 0, totalPages: 0, pageSize: 20 });
  useEffect(() => { api<Product[]>('/products', {}, tenantId).then(p => { setProducts(p); setProductId(p[0]?.id ?? ''); }).catch(e => onError(e.message)); }, [tenantId]);
  useEffect(() => { if (!productId) return; api<{ items: Movement[]; pagination: typeof pagination }>(`/stock/products/${productId}/movements?page=${page}&pageSize=20`, {}, tenantId).then(r => { setItems(r.items); setPagination(r.pagination); }).catch(e => onError(e.message)); }, [tenantId, productId, page]);
  return <section><h1>Historial</h1><div className="toolbar"><label>Producto<select value={productId} onChange={e => { setProductId(e.target.value); setPage(1); }}>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><div className="card"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Depósito</th><th>Lote</th><th>Cantidad</th><th>Notas</th></tr></thead><tbody>{items.map(i => <tr key={i.id}><td>{new Date(i.occurredAt).toLocaleString()}</td><td>{i.movementType}</td><td>{i.warehouseName}</td><td>{i.lotNumber ?? 'Sin lote'}</td><td>{i.quantity}</td><td>{i.notes ?? '—'}</td></tr>)}</tbody></table><div className="pager"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {pagination.totalPages || 1} · {pagination.total} movimientos</span><button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Siguiente</button></div></div></section>;
}

export default App;
