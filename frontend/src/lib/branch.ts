import { useEffect, useState } from 'react';

/**
 * La sucursal activa: la que se está mirando. Vive en localStorage (no viaja
 * con la cuenta) y se manda en cada request como el header `X-Branch`. El
 * backend valida contra el rango: sin `sucursales.navegar` sólo vale la propia.
 *
 * Se guarda junto al id del usuario para que al cambiar de cuenta no se herede
 * la sucursal de otra.
 */
const KEY = 'abasto-branch';
const bus = new EventTarget();

type Stored = { userId: string; branchId: string };

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return parsed.userId && parsed.branchId ? { userId: parsed.userId, branchId: parsed.branchId } : null;
  } catch {
    return null;
  }
}

/** El id de sucursal a mandar como header para este usuario, o null (= usar la propia). */
export function activeBranchFor(userId: string | undefined): string | null {
  if (!userId) return null;
  const s = read();
  return s && s.userId === userId ? s.branchId : null;
}

/**
 * Cambia la sucursal activa. Antes hacía un `location.reload()` — recargaba
 * todo el navegador (flash blanco, se pierde la transición). Ahora avisa por
 * `useBranchVersion()`, que `App.tsx` usa para remontar las rutas: cada
 * pantalla vuelve a pedir sus datos igual que con un reload, pero sin salir
 * de la página del navegador.
 */
export function setActiveBranch(userId: string, branchId: string | null) {
  try {
    if (branchId) localStorage.setItem(KEY, JSON.stringify({ userId, branchId }));
    else localStorage.removeItem(KEY);
  } catch {
    // sin persistencia: no se puede cambiar de sucursal en modo privado
  }
  bus.dispatchEvent(new Event('change'));
}

/** Sube en 1 cada vez que cambia la sucursal activa — usarlo como `key` para remontar. */
export function useBranchVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onChange = () => setVersion(v => v + 1);
    bus.addEventListener('change', onChange);
    return () => bus.removeEventListener('change', onChange);
  }, []);
  return version;
}
