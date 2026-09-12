import { useEffect } from 'react';
import { money } from '@/lib/format';

export type LabelItem = {
  name: string;
  brand?: string | null;
  barcode: string;
  /** null = todavía sin precio de venta cargado; la etiqueta sale con el precio en blanco. */
  price: number | null;
  copies: number;
};

export type PerPage = 1 | 2 | 4 | 6;

/** cols×rows de cada hoja, y el tamaño de letra (en pt) para que la etiqueta se sienta
 *  "grande de verdad" con pocas por hoja, no una etiqueta chica con aire alrededor. */
const LAYOUT: Record<PerPage, { cols: number; rows: number; brand: number; name: number; price: number; barcode: number }> = {
  1: { cols: 1, rows: 1, brand: 14, name: 28, price: 64, barcode: 16 },
  2: { cols: 1, rows: 2, brand: 11, name: 20, price: 44, barcode: 13 },
  4: { cols: 2, rows: 2, brand: 9, name: 15, price: 30, barcode: 10 },
  6: { cols: 2, rows: 3, brand: 8, name: 11, price: 21, barcode: 8 },
};

export const PER_PAGE_OPTIONS: { value: PerPage; label: string }[] = [
  { value: 1, label: '1 por hoja (grande)' },
  { value: 2, label: '2 por hoja' },
  { value: 4, label: '4 por hoja' },
  { value: 6, label: '6 por hoja (chica)' },
];

/**
 * Motor de impresión de etiquetas — un solo producto (ficha del producto) o
 * un lote de varios (Precios → Etiquetas), mismo componente. Se imprime solo
 * al recibir `items`, y pagina de a `cols×rows` por hoja: cada página es su
 * propia grilla de altura fija (`.label-page` en styles.css) con salto de
 * página forzado entre una y la siguiente, así no depende de que el cálculo
 * de alturas cierre pixel a pixel.
 */
export function LabelPrint({ items, perPage, onPrinted }: { items: LabelItem[] | null; perPage: PerPage; onPrinted?: () => void }) {
  useEffect(() => {
    if (!items?.length) return;
    const id = requestAnimationFrame(() => window.print());
    const listo = () => onPrinted?.();
    window.addEventListener('afterprint', listo);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('afterprint', listo);
    };
  }, [items, perPage, onPrinted]);

  if (!items?.length) return null;
  const layout = LAYOUT[perPage];
  const porPagina = layout.cols * layout.rows;
  const instancias = items.flatMap(it => Array.from({ length: Math.max(1, it.copies) }, () => it));
  const paginas: LabelItem[][] = [];
  for (let i = 0; i < instancias.length; i += porPagina) paginas.push(instancias.slice(i, i + porPagina));

  return (
    <div className="print-area hidden print:block">
      {paginas.map((pagina, pi) => (
        <div
          key={pi}
          className="label-page"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
            gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
            breakAfter: pi < paginas.length - 1 ? 'page' : 'auto',
          }}
        >
          {pagina.map((it, ii) => (
            <div key={ii} className="label-tag">
              {it.brand && <div style={{ fontSize: layout.brand }} className="label-tag__brand">{it.brand}</div>}
              <div style={{ fontSize: layout.name }} className="label-tag__name">{it.name}</div>
              <div style={{ fontSize: layout.price }} className="label-tag__price">{it.price != null ? money(it.price) : '—'}</div>
              <div style={{ fontSize: layout.barcode }} className="label-tag__barcode">{it.barcode}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
