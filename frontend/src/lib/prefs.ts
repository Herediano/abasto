import { useEffect, useState } from 'react';

/**
 * Preferencias de dispositivo (viven en localStorage, no viajan con la cuenta):
 * - El tamaño de las tarjetas del escritorio (chica / mediana / grande), que se
 *   cambia desde el modo Configurar.
 * El tema tiene su propio módulo (lib/theme.ts); el color de avatar es de la
 * cuenta y vive en session.user.preferences (backend). La densidad de las
 * tablas es fija: siempre compactas.
 */

// Antes de que React monte, para que no haya un salto de la tabla.
document.documentElement.setAttribute('data-density', 'compacto');

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

/** Los colores de avatar que ofrece Ajustes. El primero es el cian de la marca. */
export const AVATAR_COLORS = [
  '#0b748c', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0d9488', '#475569',
];