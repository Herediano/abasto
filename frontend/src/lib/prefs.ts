import { useEffect, useState } from 'react';

/**
 * Preferencias de dispositivo (viven en localStorage, no viajan con la cuenta):
 * la densidad de las tablas. El tema tiene su propio módulo (lib/theme.ts).
 * El color de avatar y la pantalla de inicio son de la cuenta y viven en
 * session.user.preferences (backend).
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

/** Opciones de "al abrir la app": el escritorio, o entrar directo a un módulo. */
export const startupLabel = (value: string | undefined, moduleLabel: (key: string) => string | undefined) =>
  !value || value === 'escritorio' ? 'El escritorio' : moduleLabel(value) ?? 'El escritorio';

export const resolveStartupPath = (value: string | undefined, pathForKey: (key: string) => string | undefined) => {
  if (!value || value === 'escritorio') return '/';
  return pathForKey(value) ?? '/';
};
