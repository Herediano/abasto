import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'abasto-theme';

const media = () => {
  try {
    return matchMedia('(prefers-color-scheme: dark)');
  } catch {
    return null;
  }
};

const sistema = (): Theme => (media()?.matches ? 'dark' : 'light');

/** La preferencia explícita del usuario, o `null` si sigue al sistema. */
function elegido(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Aplica el tema. Si el usuario eligió, se marca `data-theme` (gana sobre el
 * sistema, en los dos sentidos). Si sigue al sistema, se saca el atributo y
 * manda el `@media (prefers-color-scheme)` de styles.css.
 */
function aplicar(t: Theme | null) {
  const el = document.documentElement;
  if (t) el.setAttribute('data-theme', t);
  else el.removeAttribute('data-theme');
}

// Antes de que React monte, para que no haya un parpadeo de tema.
aplicar(elegido());

/**
 * Claro / oscuro. Arranca siguiendo al sistema —y sigue reaccionando a los
 * cambios del sistema— hasta que el usuario toca el botón; ahí queda fijo.
 * Un tercer estado "automático" no entra en un botón de dos íconos, pero
 * seguir al sistema hasta la primera elección sí.
 */
export function useTheme() {
  const [choice, setChoice] = useState<Theme | null>(elegido);
  const theme: Theme = choice ?? sistema();

  useEffect(() => {
    aplicar(choice);
    if (choice) return;
    // Sin elección: se escucha al sistema y se repinta.
    const m = media();
    if (!m) return;
    const onChange = () => aplicar(null);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [choice]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Sin persistencia: el tema vale para esta sesión y nada más.
    }
    setChoice(next);
  }, []);

  const ciclar = useCallback(() => {
    setChoice(prev => {
      const next: Theme = (prev ?? sistema()) === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // Sin persistencia.
      }
      return next;
    });
  }, []);

  return { theme, setTheme, ciclar };
}
