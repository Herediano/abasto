import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * `React.lazy` a la medida de nuestras páginas. Suma dos cosas sobre el `lazy`
 * pelado:
 *
 *   1. Named exports sin repetir el `.then(m => ({ default: m.X }))` en cada
 *      import: se pasa el nombre del export y listo, con tipado real (la clave
 *      se chequea contra el módulo y la página conserva sus props).
 *   2. `preload()`: baja el chunk sin renderizarlo. Lo llama el escritorio al
 *      pasar el mouse / enfocar una tarjeta y, en idle, para todo el tablero —
 *      así al hacer click la pantalla ya está en memoria.
 *   3. Recarga única ante un chunk que no baja. Tras un deploy, el index viejo
 *      pide hashes de JS que ya no existen y el `import()` rechaza; un reload lo
 *      arregla. El flag en `sessionStorage` corta el bucle si el reload no
 *      alcanzó (server caído de verdad): ahí sí propaga el error.
 */

export type Preloadable = { preload: () => Promise<void> };

const RELOAD_GUARD = 'abasto:chunk-reload';
const noop = () => {};

const guardTripped = () => {
  try { return sessionStorage.getItem(RELOAD_GUARD) === '1'; } catch { return false; }
};
const tripGuard = () => {
  try { sessionStorage.setItem(RELOAD_GUARD, '1'); } catch { /* modo privado: no hay guard, pero tampoco bucle largo */ }
};
const clearGuard = () => {
  try { sessionStorage.removeItem(RELOAD_GUARD); } catch { /* idem */ }
};

async function loadOrReloadOnce<T>(load: () => Promise<T>): Promise<T> {
  try {
    const mod = await load();
    clearGuard(); // bajó bien: el próximo fallo tiene derecho a su reload
    return mod;
  } catch (err) {
    if (!guardTripped()) {
      tripGuard();
      window.location.reload();
      return new Promise<T>(noop); // la página se está recargando: nunca resolvemos
    }
    throw err;
  }
}

export function lazyPage<M, K extends keyof M>(
  loader: () => Promise<M>,
  name: K,
): (M[K] extends ComponentType<infer P> ? LazyExoticComponent<ComponentType<P>> : never) & Preloadable {
  const load = () => loader().then(m => ({ default: m[name] as unknown as ComponentType<unknown> }));

  const Lazy = lazy(() => loadOrReloadOnce(load)) as LazyExoticComponent<ComponentType<unknown>> & Preloadable;
  Lazy.preload = () => load().then(noop, noop); // prefetch en segundo plano: nunca tira ni recarga

  return Lazy as never;
}
