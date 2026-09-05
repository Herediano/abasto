import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'abasto-theme';

function prefiereOscuro(): boolean {
  try {
    return matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function leer(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // Modo privado o almacenamiento bloqueado: se sigue al sistema sólo una vez, al arrancar.
  }
  return prefiereOscuro() ? 'dark' : 'light';
}

function aplicar(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
}

// Se aplica antes de que React monte para que no haya un parpadeo de tema.
aplicar(leer());

/** Sólo claro/oscuro: un tercer estado "automático" en un botón de dos íconos no se entiende. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(leer);

  useEffect(() => {
    aplicar(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Sin persistencia: el tema vale para esta sesión y nada más.
    }
  }, [theme]);

  const ciclar = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, ciclar };
}
