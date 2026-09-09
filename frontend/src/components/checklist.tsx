import { useEffect, useRef, useState } from 'react';
import { PencilSimple, Plus, Trash, X } from '@phosphor-icons/react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/spinner';
import { cn } from '@/lib/utils';
import { cerrarOtrosDesplegables, registrarDesplegable } from '@/lib/desplegables';

type Task = {
  id: string;
  text: string;
  done: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Lápiz del escritorio: abre un checklist de TASKS PERSONALES (por usuario, en
 * el servidor) anclado al botón, como un hamburguesa. Toggle con el mismo
 * botón; se cierra con click afuera o Escape. Optimista en todo.
 */
export function ChecklistToggle() {
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  const [open, setOpen] = useState(false);
  // null = cargando aún.
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    if (!token) return;
    try {
      setError(null);
      setTasks(await api<Task[]>('/tasks', {}, token));
    } catch (e) {
      setError(errorMessage(e));
      setTasks([]);
    }
  };
  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const agregar = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setText('');
    try {
      const creada = await api<Task>('/tasks', { method: 'POST', body: JSON.stringify({ text: t }) }, token);
      setTasks(prev => [...(prev ?? []), creada]);
    } catch (e) {
      setError(errorMessage(e));
      setText(t);
    } finally {
      setBusy(false);
    }
  };

  const alternar = async (task: Task) => {
    const antes = tasks ?? [];
    setTasks(antes.map(x => (x.id === task.id ? { ...x, done: !x.done } : x)));
    try {
      const actualizada = await api<Task>(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ done: !task.done }) }, token);
      setTasks(prev => (prev ?? []).map(x => (x.id === task.id ? actualizada : x)));
    } catch (e) {
      setTasks(antes);
      setError(errorMessage(e));
    }
  };

  const borrar = async (id: string) => {
    const antes = tasks ?? [];
    setTasks(antes.filter(x => x.id !== id));
    try {
      await api(`/tasks/${id}`, { method: 'DELETE' }, token);
    } catch (e) {
      setTasks(antes);
      setError(errorMessage(e));
    }
  };

  const limpiar = async () => {
    const antes = tasks ?? [];
    const ids = antes.filter(t => t.done).map(t => t.id);
    if (!ids.length) return;
    setTasks(antes.filter(t => !t.done));
    try {
      await Promise.all(ids.map(id => api(`/tasks/${id}`, { method: 'DELETE' }, token)));
    } catch (e) {
      setTasks(antes);
      setError(errorMessage(e));
    }
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => registrarDesplegable('tasks', () => setOpen(false)), []);

  const toggle = () => {
    const abriendo = !open;
    setOpen(o => !o);
    if (abriendo) cerrarOtrosDesplegables('tasks');
  };

  const pendiente = (tasks ?? []).filter(t => !t.done).length;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Tareas (checklist)"
        aria-expanded={open}
        className={cn(
          'uiverse-ctl group relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-background hover:text-foreground',
          open && 'border-accent-border bg-accent text-primary',
        )}
      >
        <PencilSimple className="size-[18px]" />
        {pendiente > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-md bg-warning px-1 text-[10px] font-bold leading-4 text-warning-foreground">
            {pendiente}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-md border border-border bg-card p-2 shadow-float">
          <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
            <p className="text-chico font-semibold">Tareas</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="grid size-6 place-items-center rounded-md text-placeholder hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto">
            {tasks === null ? (
              <div className="flex items-center justify-center gap-2 px-2 py-6 text-chico text-placeholder">
                <Spinner /> Cargando…
              </div>
            ) : tasks.length === 0 ? (
              <p className="px-3 py-6 text-center text-chico text-placeholder">
                Todavía no hay tareas. Anotá la primera abajo.
              </p>
            ) : (
              <div className="grid gap-0.5">
                {tasks.map(t => (
                  <div key={t.id} className="group/row flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-subtle">
                    <Checkbox
                      checked={t.done}
                      onCheckedChange={() => void alternar(t)}
                      aria-label={t.text}
                    />
                    <span className={cn('min-w-0 flex-1 truncate text-chico', t.done && 'text-placeholder line-through')}>
                      {t.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => void borrar(t.id)}
                      aria-label={`Borrar ${t.text}`}
                      className="grid size-5 shrink-0 place-items-center rounded-md text-placeholder opacity-0 transition-opacity hover:bg-background hover:text-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover/row:opacity-100"
                    >
                      <Trash className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {error && <p className="px-2 pb-1 pt-1 text-micro text-danger">{error}</p>}
            {(tasks ?? []).filter(t => t.done).length > 0 && (
              <button
                type="button"
                onClick={() => void limpiar()}
                className="mt-1 w-full rounded-md px-2 py-1 text-chico text-placeholder hover:bg-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Limpiar {(tasks ?? []).filter(t => t.done).length} completada{(tasks ?? []).filter(t => t.done).length !== 1 && 's'}
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 border-t border-border-soft pt-2">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void agregar();
              }}
              placeholder="Anotar una tarea…"
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-chico placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => void agregar()}
              disabled={busy || !text.trim()}
              aria-label="Agregar tarea"
              className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? <Spinner className="size-3.5" /> : <Plus className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}