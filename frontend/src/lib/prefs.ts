import { useEffect, useState } from 'react';

/**
 * Preferencia de dispositivo (vive en localStorage, no viaja con la cuenta):
 * la densidad de las tablas, que se cambia desde la cabecera de cada módulo.
 * El tema tiene su propio módulo (lib/theme.ts); el color de avatar es de la
 * cuenta y vive en session.user.preferences (backend).
 */

export type Density = 'comoda' | 'compacta';
const DENSITY_KEY = 'abasto-density';

function leerDensidad(): Density {
  try {
    return localStorage.getItem(DENSITY_KEY) === 'compacta' ? 'compacta' : 'comoda';
  } catch {
    return 'comoda';
  }
}

function aplicarDensidad(d: Density) {
  document.documentElement.setAttribute('data-density', d);
}

// Antes de que React monte, para que no haya un salto de la tabla.
aplicarDensidad(leerDensidad());

export function useDensity() {
  const [density, setDensity] = useState<Density>(leerDensidad);
  useEffect(() => {
    aplicarDensidad(density);
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      // sin persistencia
    }
  }, [density]);
  return { density, setDensity };
}

/** Los colores de avatar que ofrece Ajustes. El primero es el verde de la marca. */
export const AVATAR_COLORS = [
  '#1f7355', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0d9488', '#475569',
];
