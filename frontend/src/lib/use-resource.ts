import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/api';

/**
 * Reemplaza el trío `loading`/`error`/`items` + `useEffect` de fetch manual
 * que se repite página por página. `fetcher` se vuelve a llamar cuando
 * cambia algo en `deps` (como en un `useEffect` común) o cuando se pide
 * `reload()` a mano (después de guardar algo, por ejemplo).
 *
 * No reemplaza el estado de filtros/paginación de cada página — eso sigue
 * siendo de la página, que arma `fetcher` con lo que necesite y lo pasa acá
 * junto con sus dependencias. Es deliberadamente chico: no dedup, no caché
 * entre componentes, no refetch al volver el foco — si el día de mañana hace
 * falta eso, ahí sí vale la pena evaluar TanStack Query en vez de crecer esto.
 */
export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // El fetcher se recrea en cada render (arma la URL con los filtros actuales);
  // sólo nos importa la versión más nueva al ejecutar, no re-disparar por eso.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return fetcherRef.current()
      .then(setData)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, deps);

  return { data, loading, error, setError, reload: load };
}
