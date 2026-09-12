import { useEffect } from 'react';
import { fecha, fechaHora, money } from '@/lib/format';
import type { CashShift } from '@/lib/api';

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', card_debit: 'Débito', card_credit: 'Crédito', transfer: 'Transferencia', qr: 'QR', account: 'Cuenta corriente' };
const MOVIMIENTOS: Record<string, string> = { deposit: 'Ingreso', withdrawal: 'Retiro', expense: 'Gasto' };

/**
 * Reporte de caja para imprimir: "X" es una foto del turno todavía abierto
 * (no cierra nada, se puede pedir las veces que haga falta); "Z" es el mismo
 * reporte pero de un turno ya cerrado, con el arqueo (contado y diferencia)
 * agregado abajo. Mismo mecanismo que TicketPrint/LabelPrint: se imprime
 * solo al recibir un turno.
 */
export function CashShiftReport({ shift, tenantName, onPrinted }: { shift: CashShift | null; tenantName: string; onPrinted?: () => void }) {
  useEffect(() => {
    if (!shift) return;
    const id = requestAnimationFrame(() => window.print());
    const listo = () => onPrinted?.();
    window.addEventListener('afterprint', listo);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('afterprint', listo);
    };
  }, [shift, onPrinted]);

  if (!shift) return null;
  const cerrado = shift.status === 'closed';
  const esperado = Number(cerrado ? shift.expectedCash : shift.expectedCashNow) || 0;

  return (
    <div className="print-area print-ticket hidden print:block font-mono text-[11px] leading-snug text-black">
      <p className="text-center text-sm font-bold">{tenantName}</p>
      <p className="text-center">{cerrado ? 'Cierre de turno (Z)' : 'Reporte X — turno abierto'}</p>
      <p className="text-center">{shift.cashRegister?.name ?? shift.cashRegisterName ?? 'Caja'}</p>
      <hr className="my-1 border-black" />
      <p>Abrió: {shift.openedByName} · {fechaHora(shift.openedAt)}</p>
      {cerrado && <p>Cerró: {shift.closedByName} · {shift.closedAt ? fechaHora(shift.closedAt) : ''}</p>}
      {!cerrado && <p>Emitido: {fechaHora(new Date().toISOString())}</p>}
      <hr className="my-1 border-black" />
      <p className="font-bold">Ventas ({shift.salesCount ?? 0})</p>
      {(shift.totalsByMethod ?? []).map((t, i) => (
        <div key={i} className="flex justify-between"><span>{PAGOS[t.method] ?? t.method}</span><span>{money(t.total)}</span></div>
      ))}
      {!shift.totalsByMethod?.length && <p>Sin ventas todavía.</p>}
      <hr className="my-1 border-black" />
      <p className="font-bold">Movimientos de efectivo</p>
      {(shift.movements ?? []).map(m => (
        <div key={m.id} className="flex justify-between">
          <span>{MOVIMIENTOS[m.type] ?? m.type}: {m.reason}</span>
          <span>{m.type === 'deposit' ? '+' : '−'}{money(Number(m.amount))}</span>
        </div>
      ))}
      {!shift.movements?.length && <p>Ninguno.</p>}
      <hr className="my-1 border-black" />
      <div className="flex justify-between"><span>Fondo inicial</span><span>{money(Number(shift.openingCash))}</span></div>
      <div className="flex justify-between text-sm font-bold"><span>{cerrado ? 'Esperado' : 'Esperado ahora'}</span><span>{money(esperado)}</span></div>
      {cerrado && (
        <>
          <div className="flex justify-between"><span>Contado</span><span>{money(Number(shift.countedCash))}</span></div>
          <div className="flex justify-between font-bold"><span>Diferencia</span><span>{money(Number(shift.cashDifference))}</span></div>
        </>
      )}
      {shift.closingNotes && <p className="mt-1">Notas: {shift.closingNotes}</p>}
      <p className="mt-2 text-center">{cerrado ? `Cierre Z · ${fecha(shift.closedAt ?? shift.openedAt)}` : 'Reporte parcial — el turno sigue abierto'}</p>
    </div>
  );
}
