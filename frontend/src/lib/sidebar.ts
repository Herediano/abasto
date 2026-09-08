import { useSyncExternalStore } from 'react';

/**
 * La barra lateral es puro estado de interfaz de ESTE dispositivo: un booleano
 * en localStorage, nada más. No viaja con la cuenta ni toca el backend (a
 * diferencia del enredo anterior, que la mezclaba con una preferencia
 * `uiMode` y re-montaba todo el árbol al togglear).
 *
 * Store mínimo con `useSyncExternalStore` para que el riel, el botón y la
 * cabecera de cada módulo vean el mismo valor sin necesidad de un provider.
 */

const KEY = 'abasto-sidebar';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'open';
  } catch {
    return false;
  }
}

let open = read();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setSidebarOpen(next: boolean) {
  if (next === open) return;
  open = next;
  try {
    localStorage.setItem(KEY, next ? 'open' : 'closed');
  } catch {
    // Modo privado: vale para esta sesión y nada más.
  }
  emit();
}

export function toggleSidebar() {
  setSidebarOpen(!open);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Otra pestaña abrió/cerró la barra: nos alineamos.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== KEY) return;
    const next = e.newValue === 'open';
    if (next !== open) {
      open = next;
      emit();
    }
  });
}

export function useSidebar() {
  const isOpen = useSyncExternalStore(subscribe, () => open, () => false);
  return { open: isOpen, toggle: toggleSidebar, setOpen: setSidebarOpen };
}
