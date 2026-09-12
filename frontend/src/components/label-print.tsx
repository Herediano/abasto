import { useEffect } from 'react';
import { money } from '@/lib/format';

export type LabelData = {
  name: string;
  brand?: string | null;
  barcode: string;
  price: number;
  copies: number;
};

/**
 * Etiquetas de góndola: igual mecanismo que TicketPrint (se imprime solo al
 * recibir datos), pero en grilla en vez de un ticket angosto — pensada para
 * una hoja A4 común, no un rollo térmico. `copies` repite la misma etiqueta
 * (para varias puntas de góndola del mismo producto), no varios productos —
 * eso es trabajo para cuando haga falta imprimir por lote desde Precios.
 */
export function LabelPrint({ label, onPrinted }: { label: LabelData | null; onPrinted?: () => void }) {
  useEffect(() => {
    if (!label) return;
    const id = requestAnimationFrame(() => window.print());
    const listo = () => onPrinted?.();
    window.addEventListener('afterprint', listo);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('afterprint', listo);
    };
  }, [label, onPrinted]);

  if (!label) return null;
  return (
    <div className="print-area print-labels hidden print:grid">
      {Array.from({ length: label.copies }).map((_, i) => (
        <div key={i} className="label-tag">
          {label.brand && <div className="label-tag__brand">{label.brand}</div>}
          <div className="label-tag__name">{label.name}</div>
          <div className="label-tag__price">{money(label.price)}</div>
          <div className="label-tag__barcode">{label.barcode}</div>
        </div>
      ))}
    </div>
  );
}
