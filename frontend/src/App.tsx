import { useEffect, useMemo, useState } from 'react';
import { Boxes, ChevronDown, CircleHelp, LayoutDashboard, Package, Plus, Search, Settings, Store, Truck, Users, Warehouse, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
type Tenant = { id: string; name: string; legalName?: string | null };
type Product = { id: string; sku: string; name: string; category?: string | null; unit: string; brand?: string | null; manejaVencimiento: boolean; isActive: boolean };

async function api<T>(path: string, options?: RequestInit, tenantId?: string) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(tenantId ? { 'x-tenant-id': tenantId } : {}), ...options?.headers } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'No se pudo completar la operación');
  return response.json() as Promise<T>;
}

function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sku: '', name: '', category: 'Almacén', unit: 'unidad', brand: '', manejaVencimiento: false });

  useEffect(() => { api<Tenant[]>('/tenants').then(data => { setTenants(data); setTenantId(data[0]?.id ?? ''); }).catch(e => setError(e.message)); }, []);
  useEffect(() => { if (!tenantId) return; setLoading(true); api<Product[]>('/products', undefined, tenantId).then(setProducts).catch(e => setError(e.message)).finally(() => setLoading(false)); }, [tenantId]);

  const selectedTenant = tenants.find(t => t.id === tenantId);
  const filtered = useMemo(() => products.filter(p => `${p.name} ${p.sku} ${p.category ?? ''}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  async function createProduct(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try { const created = await api<Product>('/products', { method: 'POST', body: JSON.stringify(form) }, tenantId); setProducts(old => [...old, created]); setModal(false); setForm({ sku: '', name: '', category: 'Almacén', unit: 'unidad', brand: '', manejaVencimiento: false }); } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Boxes size={20}/></div><div><strong>Mayorista</strong><span>ERP CONTROL</span></div></div>
      <div className="tenant-picker"><span>EMPRESA ACTIVA</span><button onClick={() => setTenantId(tenants[(tenants.findIndex(t => t.id === tenantId) + 1) % Math.max(tenants.length, 1)]?.id ?? '')}>{selectedTenant?.name ?? 'Cargando...'}<ChevronDown size={16}/></button><small>Operación principal</small></div>
      <nav><p>GESTIÓN</p><a className="active"><LayoutDashboard size={18}/> Resumen</a><a><Package size={18}/> Productos <em>{products.length}</em></a><a><Warehouse size={18}/> Inventario</a><a><Truck size={18}/> Proveedores</a><a><Users size={18}/> Clientes</a><p>CONFIGURACIÓN</p><a><Settings size={18}/> Preferencias</a></nav>
      <div className="sidebar-footer"><div className="avatar">LM</div><div><strong>Luciano M.</strong><span>Administrador</span></div><CircleHelp size={17}/></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>Inicio</span><b>/</b><strong>Resumen</strong></div><div className="top-actions"><span className="status-dot"><i/> Sistema operativo</span><button className="icon-button"><CircleHelp size={18}/></button><div className="user-avatar">LM</div></div></header>
      <div className="page"><div className="page-heading"><div><div className="eyebrow">DOMINGO, 30 DE AGOSTO DE 2026</div><h1>Resumen general <span>👋</span></h1><p>Esto es lo que está pasando en tu operación hoy.</p></div><button className="primary" onClick={() => setModal(true)}><Plus size={18}/> Nuevo producto</button></div>
        {error && <div className="alert"><strong>Atención:</strong> {error}<button onClick={() => setError('')}><X size={15}/></button></div>}
        <section className="metrics"><Metric label="Productos activos" value={products.length.toString()} detail="en catálogo" icon={<Package/>} tone="blue"/><Metric label="Valor de inventario" value="$ 0" detail="pendiente de movimientos" icon={<Boxes/>} tone="violet"/><Metric label="Stock bajo" value="0" detail="requieren atención" icon={<Warehouse/>} tone="amber"/><Metric label="Clientes" value="—" detail="módulo próximo" icon={<Users/>} tone="green"/></section>
        <section className="content-card"><div className="card-heading"><div><h2>Productos</h2><p>Catálogo de {selectedTenant?.name ?? 'la empresa'}</p></div><button className="ghost" onClick={() => setModal(true)}><Plus size={16}/> Agregar</button></div><div className="toolbar"><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre, SKU o categoría..."/></div><button className="filter">Todos los productos <ChevronDown size={16}/></button></div>{loading ? <div className="empty">Cargando productos...</div> : filtered.length === 0 ? <div className="empty">No hay productos que coincidan con la búsqueda.</div> : <div className="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>SKU</th><th>CATEGORÍA</th><th>UNIDAD</th><th>VENCIMIENTO</th><th>ESTADO</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><div className="product-cell"><div className="product-icon"><Package size={17}/></div><strong>{p.name}</strong></div></td><td><code>{p.sku}</code></td><td><span className="category">{p.category ?? 'Sin categoría'}</span></td><td>{p.unit}</td><td>{p.manejaVencimiento ? <span className="tag warning">Controlado</span> : <span className="muted">No aplica</span>}</td><td><span className="tag success"><i/>{p.isActive ? 'Activo' : 'Inactivo'}</span></td></tr>)}</tbody></table></div>}</section>
        <div className="footnote"><span><Store size={15}/> {tenants.length} empresas configuradas</span><span>Datos sincronizados con la API local</span></div>
      </div>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setModal(false)}><form className="modal" onSubmit={createProduct}><div className="modal-head"><div><span className="eyebrow">CATÁLOGO</span><h2>Nuevo producto</h2></div><button type="button" className="icon-button" onClick={() => setModal(false)}><X size={18}/></button></div><label>Nombre<input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej. Yerba mate 1 kg"/></label><div className="form-grid"><label>SKU<input required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="YERBA-001"/></label><label>Unidad<select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}><option>unidad</option><option>caja</option><option>kilo</option><option>litro</option></select></label></div><div className="form-grid"><label>Categoría<input value={form.category} onChange={e => setForm({...form, category: e.target.value})}/></label><label>Marca<input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}/></label></div><label className="check"><input type="checkbox" checked={form.manejaVencimiento} onChange={e => setForm({...form, manejaVencimiento: e.target.checked})}/> Requiere control de vencimiento</label><div className="modal-actions"><button type="button" className="ghost" onClick={() => setModal(false)}>Cancelar</button><button className="primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar producto'}</button></div></form></div>}
  </div>
}

function Metric({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: string }) { return <div className="metric"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }

export default App;
