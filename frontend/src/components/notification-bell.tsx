import { useEffect, useState } from 'react';
import { Bell } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Menu, MenuBlock, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { pendientes, type EscritorioSummary } from '@/lib/escritorio';
import { hueFor } from '@/lib/modules';
import { cerrarOtrosDesplegables, registrarDesplegable } from '@/lib/desplegables';

/**
 * El botón de notificaciones del escritorio: "Para mirar hoy" hoy vive acá, no
 * en chips bajo el saludo. Una campana con el conteo de pendientes; al abrir,
 * la lista de los que hay, cada uno con el color del módulo al que enlaza.
 */
export function NotificationBell({ summary }: { summary: EscritorioSummary | null }) {
  const navigate = useNavigate();
  const items = summary ? pendientes(summary) : [];
  const [open, setOpen] = useState(false);

  useEffect(() => registrarDesplegable('bell', () => setOpen(false)), []);

  return (
    <Menu
      open={open}
      onOpenChange={v => {
        if (v) cerrarOtrosDesplegables('bell');
        setOpen(v);
      }}
      modal={false}
    >
      <MenuTrigger
        aria-label="Notificaciones"
        className="uiverse-ctl group relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-background hover:text-foreground data-[state=open]:border-accent-border data-[state=open]:bg-accent data-[state=open]:text-primary"
      >
        <Bell className="size-[18px]" />
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-md bg-warning px-1 text-[10px] font-bold leading-4 text-warning-foreground">
            {items.length}
          </span>
        )}
      </MenuTrigger>

      <MenuContent className="w-80 p-2">
        <MenuLabel className="px-2.5">Para mirar hoy</MenuLabel>
        {!summary ? (
          <MenuBlock className="text-chico text-placeholder">Cargando el estado del negocio…</MenuBlock>
        ) : items.length === 0 ? (
          <MenuBlock className="text-chico text-muted-foreground">Hoy no hay nada urgente.</MenuBlock>
        ) : (
          <div className="grid gap-0.5">
            {items.map(it => (
              <MenuItem key={it.path} onSelect={() => navigate(it.path, { viewTransition: true })}>
                <span className="size-2 shrink-0 rounded-full" style={{ background: hueFor(it.module) }} />
                <span className="min-w-0 flex-1 truncate">{it.label}</span>
                {it.count > 1 && <span className="font-semibold text-muted-foreground">{it.count}</span>}
              </MenuItem>
            ))}
          </div>
        )}
        <MenuSeparator />
        <MenuBlock className="px-2.5 text-micro text-placeholder">
          Al tocar un pendiente vas directo al módulo correspondiente.
        </MenuBlock>
      </MenuContent>
    </Menu>
  );
}