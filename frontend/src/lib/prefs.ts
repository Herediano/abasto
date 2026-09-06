import { useEffect, useState } from 'react';

/**
 * Preferencias de dispositivo (viven en localStorage, no viajan con la cuenta):
 * - La densidad de las tablas (espacioso / compacto), que se cambia desde la
 *   cabecera de cada módulo.
 * - El tamaño de las tarjetas del escritorio (chica / mediana / grande), que se
 *   cambia desde el modo Configurar.
 * El tema tiene su propio módulo (lib/theme.ts); el color de avatar es de la
 * cuenta y vive en session.user.preferences (backend).
 */

export type Density = 'espacioso' | 'compacto';
const DENSITY_KEY = 'abasto-density';

function leerDensidad(): Density {
  try {
    const v = localStorage.getItem(DENSITY_KEY);
    // Compat: valores viejos 'comoda'/'compacta'.
    if (v === 'compacto' || v === 'compacta' || v === 'compact') return 'compacto';
    return 'espacioso';
  } catch {
    return 'espacioso';
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

export type TileSize = 'chica' | 'mediana' | 'grande';
const TILES_KEY = 'abasto-tiles';

function leerTiles(): TileSize {
  try {
    const v = localStorage.getItem(TILES_KEY);
    if (v === 'chica' || v === 'grande') return v;
    return 'mediana';
  } catch {
    return 'mediana';
  }
}

export function useTiles() {
  const [tiles, setTiles] = useState<TileSize>(leerTiles);
  useEffect(() => {
    try {
      localStorage.setItem(TILES_KEY, tiles);
    } catch {
      // sin persistencia
    }
  }, [tiles]);
  return { tiles, setTiles };
}

/** Los colores de avatar que ofrece Ajustes. El primero es el verde de la marca. */
export const AVATAR_COLORS = [
  '#1f7355', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0d9488', '#475569',
];