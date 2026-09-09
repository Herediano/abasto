import { useEffect, useState } from 'react';

/**
 * Preferencias de dispositivo (viven en localStorage, no viajan con la cuenta):
 * - El tamaño de las tarjetas del escritorio (chica / mediana / grande), que se
 *   cambia desde el modo Configurar.
 * - El botón Preguntar: fijo en su posición por defecto, o libre para arrastrarlo
 *   a cualquier lugar (el lugar guardado es "abasto-preguntar-reposo").
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

const PREGUNTAR_LIBRE_KEY = 'abasto-preguntar-libre';
const PREGUNTAR_LIBRE_EVENT = 'abasto:preguntar-libre';

function leerPreguntarLibre(): boolean {
  try {
    return localStorage.getItem(PREGUNTAR_LIBRE_KEY) === '1';
  } catch {
    return false;
  }
}

/** El botón Preguntar del escritorio arranca fijo en su posición por defecto
 *  (arriba al centro); "libre" habilita arrastrarlo a cualquier lugar y que la
 *  posición quede guardada en este dispositivo. El estado se comparte entre
 *  componentes (Ajustes, header, shell, flotante) vía un evento, así activar
 *  "libre" en Ajustes actualiza el header y el flotante al instante, sin
 *  recargar. */
export function usePreguntarLibre() {
  const [libre, setLibre] = useState<boolean>(leerPreguntarLibre);
  useEffect(() => {
    function onCambio(e: Event) {
      setLibre((e as CustomEvent<boolean>).detail);
    }
    window.addEventListener(PREGUNTAR_LIBRE_EVENT, onCambio);
    return () => window.removeEventListener(PREGUNTAR_LIBRE_EVENT, onCambio);
  }, []);
  const cambiar = (v: boolean) => {
    setLibre(v);
    try {
      localStorage.setItem(PREGUNTAR_LIBRE_KEY, v ? '1' : '0');
    } catch {
      // sin persistencia
    }
    window.dispatchEvent(new CustomEvent(PREGUNTAR_LIBRE_EVENT, { detail: v }));
  };
  return { libre, setLibre: cambiar };
}

/** Los colores de avatar que ofrece Ajustes. El primero es el cian de la marca. */
export const AVATAR_COLORS = [
  '#0b748c', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0d9488', '#475569',
];