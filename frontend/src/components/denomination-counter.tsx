import { Input } from '@/components/ui/input';
import { money } from '@/lib/format';

/**
 * Billetes en circulación a contar en un arqueo o un retiro. Vive acá (no en
 * el backend) porque el backend no valida contra una lista fija — cuando
 * salga un billete nuevo, esto es lo único que hay que tocar.
 */
export const DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 20, 10] as const;

export type DenominationCount = Record<string, string>;

export function denominationTotal(count: DenominationCount): number {
  return DENOMINATIONS.reduce((sum, d) => sum + d * (Number(count[d]) || 0), 0);
}

/**
 * Conteo de efectivo billete por billete: en vez de tipear un total a ojo,
 * el procedimiento correcto de arqueo es contar cuántos hay de cada
 * denominación y que el total salga de ahí. Se usa tanto para cerrar un
 * turno como para un retiro de caja.
 */
export function DenominationCounter({ value, onChange }: { value: DenominationCount; onChange: (value: DenominationCount) => void }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="grid grid-cols-[1fr_5rem_6rem] items-center gap-x-3 gap-y-1.5">
        <span className="text-chico font-semibold text-placeholder">Billete</span>
        <span className="text-chico font-semibold text-placeholder text-right">Cantidad</span>
        <span className="text-chico font-semibold text-placeholder text-right">Subtotal</span>
        {DENOMINATIONS.map(d => {
          const qty = Number(value[d]) || 0;
          return (
            <div className="contents" key={d}>
              <label htmlFor={`billete-${d}`} className="text-sm">${d}</label>
              <Input
                id={`billete-${d}`}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={value[d] ?? ''}
                onChange={e => onChange({ ...value, [d]: e.target.value })}
                className="h-8 text-right tabular"
              />
              <span className="text-right text-sm tabular text-muted-foreground">{qty > 0 ? money(d * qty) : '—'}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-semibold">
        <span>Total contado</span>
        <span className="tabular">{money(denominationTotal(value))}</span>
      </div>
    </div>
  );
}
