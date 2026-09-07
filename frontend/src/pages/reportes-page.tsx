import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { PageSpinner } from '@/components/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, errorMessage } from '@/lib/api';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', qr: 'QR', account: 'Cuenta corriente' };

type Panel = {
  range: { from: string; to: string };
  verPlata: boolean;
  totales: { ventas: number; tickets: number; recargos: number };
  porMedioDePago: { method: string; total: number; count: number }[];
  porCajero: { name: string; total: number; count: number }[];
  porSucursal: { warehouse: string; branch: string; total: number; count: number }[];
  masVendidos: { name: string; qty: number; revenue: number; margin: number | null }[];
  stockValorizado: number | null;
  arqueosConDiferencia: { id: string; cashRegister: string; closedBy: string; closedAt: string | null; difference: number }[];
  cuentasCorrientes: { id: string; name: string; balance: number; creditLimit: number | null }[];
};

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-micro font-semibold text-placeholder">{label}</p>
      <p className="mt-1 font-display text-h2 font-semibold tabular">{value}</p>
      {hint && <p className="mt-0.5 text-micro text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Bloque({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

export function ReportesPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const hoy = new Date().toISOString().slice(0, 10);
  const hace30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [from, setFrom] = useState(hace30);
  const [to, setTo] = useState(hoy);
  const [data, setData] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ from, to });
    api<Panel>(`/reportes/panel?${p}`, {}, token)
      .then(setData)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [token, from, to]);

  return (
    <>
      <PageHeader title="Reportes" description="El pulso del negocio en un rango de fechas: ventas, márgenes, más vendidos y arqueos." />
      {error && <Alert variant="destructive">{error}</Alert>}

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
          <Field label="Desde" htmlFor="r-from">
            <Input id="r-from" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} />
          </Field>
          <Field label="Hasta" htmlFor="r-to">
            <Input id="r-to" type="date" value={to} min={from} max={hoy} onChange={e => setTo(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {loading || !data ? (
        <PageSpinner />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="Ventas" value={money(data.totales.ventas)} hint={`${data.totales.tickets} tickets`} />
            <Tile label="Ticket promedio" value={money(data.totales.tickets ? data.totales.ventas / data.totales.tickets : 0)} />
            {data.verPlata && data.stockValorizado != null && (
              <Tile label="Stock valorizado" value={money(data.stockValorizado)} hint="a costo, sucursal activa" />
            )}
          </div>

          <Bloque title="Ventas por medio de pago">
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
          </Bloque>

          <Bloque title="Comparativa entre sucursales">
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
          </Bloque>

          <Bloque title="Ventas por cajero">
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
          </Bloque>

          <Bloque title="Más vendidos">
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
          </Bloque>

          <Bloque title="Arqueos con diferencia">
            {data.arqueosConDiferencia.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ningún turno cerró con diferencia en este rango.</p>
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
                      <TableCell>{a.closedAt ? a.closedAt.slice(0, 10) : '—'}</TableCell>
                      <TableCell className={`text-right tabular font-medium ${a.difference < 0 ? 'text-destructive' : 'text-warning'}`}>
                        {a.difference > 0 ? '+' : ''}{money(a.difference)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Bloque>

          <Bloque title="Cuentas corrientes con saldo">
            {data.cuentasCorrientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ningún cliente tiene saldo pendiente.</p>
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
          </Bloque>
        </>
      )}
    </>
  );
}
