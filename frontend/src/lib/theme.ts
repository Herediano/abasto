import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const KEY = 'abasto-theme';

function leer(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // Modo privado o almacenamiento bloqueado: se sigue al sistema.
  }
  return 'system';
}

/**
 * "system" no estampa nada en el <html>: sin atributo, manda la media query
 * `prefers-color-scheme` que define styles.css. Elegir claro u oscuro estampa
 * data-theme, que le gana al sistema en las dos direcciones.
 */
function aplicar(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
}

// Se aplica antes de que React monte para que no haya un parpadeo de tema.
aplicar(leer());

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(leer);

  useEffect(() => {
    aplicar(theme);
    try {
      if (theme === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      // Sin persistencia: el tema vale para esta sesión y nada más.
    }
  }, [theme]);

  /** Recorre claro → oscuro → automático. */
  const ciclar = useCallback(() => {
    setTheme(t => (t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light'));
  }, []);

  return { theme, setTheme, ciclar };
}
