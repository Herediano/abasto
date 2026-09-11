import { useEffect, useState } from 'react';
import { CalendarBlank, Tag as TagIcon, X } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModuleSection } from '@/components/module-screen';
import { PageSpinner } from '@/components/spinner';
import { api, errorMessage, type Promotion, type ScheduledChange } from '@/lib/api';
import { fecha } from '@/lib/format';

/**
 * "Qué cambia y cuándo", en un solo lugar. Antes había que mirar dos pantallas
 * separadas para saber la semana que viene: "Cambios programados" (dentro de
 * Actualizar) para los precios, y la columna Vigencia de Promociones para las
 * ofertas. Este calendario junta las dos fuentes en una sola línea de tiempo,
 * sin guardar nada nuevo — es una lectura combinada de lo que ya existe.
 */

type Props = {
  token: string;
  promotions: Promotion[];
  onError: (message: string) => void;
  onEditPromotion: (promo: Promotion) => void;
};

type Evento = {
  key: string;
  date: Date;
  kind: 'precio' | 'promo-inicio' | 'promo-fin';
  title: string;
  detail?: string;
  onCancel?: () => void;
};

const DIAS_LABEL = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Mismo criterio compacto que la tabla de Promociones, para no repetir el JSON crudo. */
function describirVigenciaSemanal(p: Promotion): string | null {
  if (!p.daysOfWeek.length && !p.startTime) return null;
  const dias = p.daysOfWeek.length === 0 ? null : p.daysOfWeek.map(d => DIAS_LABEL[d]).join(', ');
  const horario = p.startTime && p.endTime ? `${p.startTime} a ${p.endTime}` : null;
  return [dias, horario].filter(Boolean).join(' · ');
}

export function CalendarView({ token, promotions, onError, onEditPromotion }: Props) {
  const [scheduled, setScheduled] = useState<ScheduledChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const loadScheduled = () =>
    api<ScheduledChange[]>('/prices/scheduled', {}, token)
      .then(setScheduled)
      .catch(e => onError(errorMessage(e)))
      .finally(() => setLoading(false));

  useEffect(() => { void loadScheduled(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelarProgramado = async (c: ScheduledChange) => {
    const clave = `${c.priceListId}|${c.validFrom}`;
    setCancelando(clave);
    try {
      await api(`/prices/scheduled?priceListId=${c.priceListId}&validFrom=${encodeURIComponent(c.validFrom)}`, { method: 'DELETE' }, token);
      await loadScheduled();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setCancelando(null);
    }
  };

  const ahora = new Date();
  const eventos: Evento[] = [];

  for (const c of scheduled) {
    const clave = `${c.priceListId}|${c.validFrom}`;
    eventos.push({
      key: `precio-${clave}`,
      date: new Date(c.validFrom),
      kind: 'precio',
      title: `${c.products} producto${c.products === 1 ? '' : 's'} cambia${c.products === 1 ? '' : 'n'} de precio en «${c.priceListName}»`,
      onCancel: () => cancelarProgramado(c),
    });
  }

  for (const p of promotions) {
    const desde = new Date(p.validFrom);
    if (desde > ahora) {
      eventos.push({
        key: `promo-inicio-${p.id}`,
        date: desde,
        kind: 'promo-inicio',
        title: `Arranca la promo «${p.name}»`,
        detail: describirVigenciaSemanal(p) ?? undefined,
      });
    }
    if (p.validTo) {
      const hasta = new Date(p.validTo);
      if (hasta > ahora) {
        eventos.push({
          key: `promo-fin-${p.id}`,
          date: hasta,
          kind: 'promo-fin',
          title: `Termina la promo «${p.name}»`,
        });
      }
    }
  }

  eventos.sort((a, b) => a.date.getTime() - b.date.getTime());

  const promoDe = (key: string) => {
    const id = key.replace('promo-inicio-', '').replace('promo-fin-', '');
    return promotions.find(p => p.id === id);
  };

  return (
    <div className="flex flex-col">
      <ModuleSection
        title="Qué cambia y cuándo"
        description="Precios programados y promociones que todavía no arrancaron o están por terminar, en una sola línea de tiempo. No es una pantalla más para cargar nada: se arma sola con lo que ya tenés en Actualizar y en Promociones."
      >
        {loading ? (
          <PageSpinner />
        ) : eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay nada programado. Un precio con fecha futura o una promo con inicio/fin próximo van a aparecer acá.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {eventos.map(ev => (
              <li key={ev.key} className="flex items-center gap-3 rounded-md border p-3">
                <div className="flex w-24 shrink-0 flex-col items-center rounded-md bg-muted/60 py-1.5 text-center">
                  <CalendarBlank className="mb-0.5 size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{fecha(ev.date.toISOString())}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {ev.kind !== 'precio' && <TagIcon className="mr-1 inline size-3.5 text-muted-foreground" />}
                    {ev.title}
                  </p>
                  {ev.detail && <p className="text-xs text-muted-foreground">{ev.detail}</p>}
                </div>
                <Badge variant="outline">
                  {ev.kind === 'precio' ? 'precio' : ev.kind === 'promo-inicio' ? 'promo · inicio' : 'promo · fin'}
                </Badge>
                {ev.onCancel && (
                  <Button variant="ghost" size="sm" onClick={ev.onCancel} disabled={cancelando !== null}>
                    <X /> Cancelar
                  </Button>
                )}
                {ev.kind !== 'precio' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { const p = promoDe(ev.key); if (p) onEditPromotion(p); }}
                  >
                    Ver
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </ModuleSection>
    </div>
  );
}
