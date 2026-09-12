import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ExportButton } from '@/components/export-menu';
import { ModuleScreen, ModuleSection, SummaryLine } from '@/components/module-screen';
import { ReportesHelp } from '@/components/reportes-help';
import { PageSpinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage, type Branch } from '@/lib/api';
import { fecha, inputDate, money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

type View = 'ventas' | 'caja' | 'cuentas';

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', card_debit: 'Débito', card_credit: 'Crédito', transfer: 'Transferencia', qr: 'QR', account: 'Cuenta corriente' };

type Panel = {
  range: { from: string; to: string };
  verPlata: boolean;
  totales: { ventas: number; tickets: number; recargos: number };
  porMedioDePago: { method: string; total: number; count: number }[];
  porCajero: { name: string; total: number; count: number }[];
  porSucursal: { warehouse: string; branch: string; total: number; count: number }[];
  masVendidos: { name: string; qty: number; revenue: number; margin: number | null }[];
  sinRotacion: { name: string; stock: number; lastSaleAt: string | null; valorizado: number | null }[];
  stockValorizado: number | null;
  arqueosConDiferencia: { id: string; cashRegister: string; closedBy: string; closedAt: string | null; difference: number }[];
  cuentasCorrientes: { id: string; name: string; balance: number; creditLimit: number | null }[];
};

export function ReportesPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const puedeVerTodas = !!session!.user.canNavigateBranches;
  const [view, setView] = useState<View>('ventas');
  const hoy = inputDate();
  const hace30 = inputDate(Date.now() - 30 * 864e5);
  const [from, setFrom] = useState(hace30);
  const [to, setTo] = useState(hoy);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [data, setData] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (puedeVerTodas) api<Branch[]>('/branches', {}, token).then(setBranches).catch(() => {});
  }, [token, puedeVerTodas]);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ from, to });
    if (branchId) p.set('branchId', branchId);
    api<Panel>(`/reportes/panel?${p}`, {}, token)
      .then(setData)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [token, from, to, branchId]);

  const resumen = data && (
    <SummaryLine
      items={[
        { label: 'Ventas', value: money(data.totales.ventas) },
        { label: 'Ticket promedio', value: money(data.totales.tickets ? data.totales.ventas / data.totales.tickets : 0) },
        ...(data.verPlata && data.stockValorizado != null
          ? [{ label: 'Stock valorizado', value: money(data.stockValorizado) }]
          : []),
      ]}
    />
  );

  return (
    <ModuleScreen
      title="Reportes"
      help={<ReportesHelp />}
      summary={resumen || undefined}
      views={[
        { key: 'ventas', label: 'Ventas' },
        { key: 'caja', label: 'Caja' },
        { key: 'cuentas', label: 'Cuentas' },
      ]}
      view={view}
      onView={k => setView(k as View)}
    >
      {error && <Alert variant="destructive">{error}</Alert>}

      {/* El rango de fechas es el control principal de Reportes: queda a la
          vista, no detrás de «Filtros». */}
      <div className={`grid gap-3 sm:max-w-2xl ${puedeVerTodas ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <Field label="Desde" htmlFor="r-from">
          <Input id="r-from" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} />
        </Field>
        <Field label="Hasta" htmlFor="r-to">
          <Input id="r-to" type="date" value={to} min={from} max={hoy} onChange={e => setTo(e.target.value)} />
        </Field>
        {puedeVerTodas && (
          <Field label="Sucursal" htmlFor="r-branch">
            <Select id="r-branch" value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">Todas las sucursales</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      {loading || !data ? (
        <PageSpinner />
      ) : view === 'ventas' ? (
        <div className="flex flex-col">
          <ModuleSection
            title="Por medio de pago"
            actions={<ExportButton path="/reportes/panel" params={{ from, to, branchId, section: 'medioDePago' }} filename="ventas-por-medio-de-pago" />}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medio</TableHead>
                  <TableHead className="text-right">Operaciones</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.porMedioDePago.map(m => (
                  <TableRow key={m.method}>
                    <TableCell>{PAGOS[m.method] ?? m.method}</TableCell>
                    <TableCell className="text-right tabular">{m.count}</TableCell>
                    <TableCell className="text-right tabular">{money(m.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ModuleSection>

          <ModuleSection
            title="Por cajero"
            actions={<ExportButton path="/reportes/panel" params={{ from, to, branchId, section: 'cajero' }} filename="ventas-por-cajero" />}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cajero</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.porCajero.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right tabular">{c.count}</TableCell>
                    <TableCell className="text-right tabular">{money(c.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ModuleSection>

          <ModuleSection
            title="Comparativa entre sucursales"
            actions={<ExportButton path="/reportes/panel" params={{ from, to, branchId, section: 'sucursales' }} filename="ventas-por-sucursal" />}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.porSucursal.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{s.branch}{s.warehouse !== s.branch ? ` · ${s.warehouse}` : ''}</TableCell>
                    <TableCell className="text-right tabular">{s.count}</TableCell>
                    <TableCell className="text-right tabular">{money(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ModuleSection>

          <ModuleSection
            title="Más vendidos"
            actions={<ExportButton path="/reportes/panel" params={{ from, to, branchId, section: 'masVendidos' }} filename="mas-vendidos" />}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Facturado</TableHead>
                  {data.verPlata && <TableHead className="text-right">Margen</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.masVendidos.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tabular">{r.qty}</TableCell>
                    <TableCell className="text-right tabular">{money(r.revenue)}</TableCell>
                    {data.verPlata && <TableCell className="text-right tabular">{r.margin != null ? money(r.margin) : '—'}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ModuleSection>

          <ModuleSection
            title="Sin rotación"
            actions={data.sinRotacion.length > 0 ? <ExportButton path="/reportes/panel" params={{ from, to, branchId, section: 'sinRotacion' }} filename="sin-rotacion" /> : undefined}
          >
            {data.sinRotacion.length === 0 ? (
              <p className="text-chico text-muted-foreground">Todo lo que tiene stock se vendió al menos una vez en este rango.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Última venta</TableHead>
                    {data.verPlata && <TableHead className="text-right">Valorizado</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sinRotacion.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right tabular">{r.stock}</TableCell>
                      <TableCell>{r.lastSaleAt ? fecha(r.lastSaleAt) : <span className="text-muted-foreground">Nunca</span>}</TableCell>
                      {data.verPlata && <TableCell className="text-right tabular">{r.valorizado != null ? money(r.valorizado) : '—'}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ModuleSection>
        </div>
      ) : view === 'caja' ? (
        <div className="flex flex-col">
          <ModuleSection
            title="Arqueos con diferencia"
            actions={data.arqueosConDiferencia.length > 0 ? <ExportButton path="/reportes/panel" params={{ from, to, branchId, section: 'arqueos' }} filename="arqueos-con-diferencia" /> : undefined}
          >
            {data.arqueosConDiferencia.length === 0 ? (
              <p className="text-chico text-muted-foreground">Ningún turno cerró con diferencia en este rango.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caja</TableHead>
                    <TableHead>Cerró</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.arqueosConDiferencia.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{a.cashRegister}</TableCell>
                      <TableCell>{a.closedBy}</TableCell>
                      <TableCell>{fecha(a.closedAt)}</TableCell>
                      <TableCell className={`text-right tabular font-medium ${a.difference < 0 ? 'text-destructive' : 'text-warning'}`}>
                        {a.difference > 0 ? '+' : ''}{money(a.difference)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ModuleSection>
        </div>
      ) : (
        <div className="flex flex-col">
          <ModuleSection
            title="Cuentas corrientes con saldo"
            actions={data.cuentasCorrientes.length > 0 ? <ExportButton path="/reportes/panel" params={{ from, to, branchId, section: 'cuentas' }} filename="cuentas-corrientes" /> : undefined}
          >
            {data.cuentasCorrientes.length === 0 ? (
              <p className="text-chico text-muted-foreground">Ningún cliente tiene saldo pendiente.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Límite</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cuentasCorrientes.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className={`text-right tabular ${c.balance > 0 ? 'text-warning' : 'text-success'}`}>{money(c.balance)}</TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">{c.creditLimit != null ? money(c.creditLimit) : 'sin tope'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ModuleSection>
        </div>
      )}
    </ModuleScreen>
  );
}
