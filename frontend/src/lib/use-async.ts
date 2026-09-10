import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './api';

export type ActionStatus = 'idle' | 'saving' | 'ok' | 'error';

export type UseAsyncActionOptions<TResult> = {
  onSuccess?: (data: TResult) => void | Promise<void>;
  onError?: (err: unknown, message: string) => void;
  /** Tiempo en milisegundos para volver el estado de 'ok' a 'idle' automáticamente. Ej: 1800ms. */
  autoResetMs?: number;
};

/**
 * Hook para acciones asíncronas y formularios (guardar, editar, eliminar).
 * Centraliza los estados de carga ('saving'), éxito ('ok') y error con captura automática.
 */
export function useAsyncAction<TArgs extends any[], TResult = unknown>(
  actionFn: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions<TResult> = {},
) {
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [error, setError] = useState<string>('');
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('idle');
    setError('');
  }, []);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus('saving');
      setError('');
      try {
        const result = await actionFn(...args);
        setStatus('ok');
        if (optionsRef.current.onSuccess) {
          await optionsRef.current.onSuccess(result);
        }
        if (optionsRef.current.autoResetMs) {
          timeoutRef.current = setTimeout(() => {
            setStatus('idle');
          }, optionsRef.current.autoResetMs);
        }
        return result;
      } catch (err) {
        const msg = errorMessage(err);
        setError(msg);
        setStatus('error');
        if (optionsRef.current.onError) {
          optionsRef.current.onError(err, msg);
        }
        return undefined;
      }
    },
    [actionFn],
  );

  return {
    execute,
    status,
    saving: status === 'saving',
    isOk: status === 'ok',
    isError: status === 'error',
    error,
    setError,
    reset,
  };
}

export type UseDataLoaderOptions<T> = {
  initialData?: T;
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (err: unknown, message: string) => void;
};

/**
 * Hook para carga inicial y recarga de datos (listas, tablas, selects).
 * Maneja loading, error y evita race conditions si el componente se desmonta.
 */
export function useDataLoader<T>(
  loaderFn: () => Promise<T>,
  deps: readonly any[] = [],
  options: UseDataLoaderOptions<T> = {},
) {
  const [data, setData] = useState<T | undefined>(options.initialData);
  const [loading, setLoading] = useState<boolean>(options.immediate ?? true);
  const [error, setError] = useState<string>('');
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await loaderFn();
      setData(result);
      if (optionsRef.current.onSuccess) {
        optionsRef.current.onSuccess(result);
      }
      return result;
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      if (optionsRef.current.onError) {
        optionsRef.current.onError(err, msg);
      }
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [loaderFn]);

  useEffect(() => {
    let alive = true;
    if (options.immediate !== false) {
      setLoading(true);
      setError('');
      loaderFn()
        .then(res => {
          if (!alive) return;
          setData(res);
          optionsRef.current.onSuccess?.(res);
        })
        .catch(err => {
          if (!alive) return;
          const msg = errorMessage(err);
          setError(msg);
          optionsRef.current.onError?.(err, msg);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }
    return () => {
      alive = false;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    setData,
    loading,
    error,
    setError,
    reload: load,
  };
}
