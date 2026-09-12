import { useEffect, type ReactNode } from 'react';
import { DENOMINATIONS } from '@/components/denomination-counter';
import { fechaHora, money } from '@/lib/format';
import type { CashShift } from '@/lib/api';

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', card_debit: 'Débito', card_credit: 'Crédito', transfer: 'Transferencia', qr: 'QR', account: 'Cuenta corriente' };
const MOVIMIENTOS: Record<string, string> = { deposit: 'Ingreso', withdrawal: 'Retiro', expense: 'Gasto' };

function billetesTexto(count?: Record<string, number> | null) {
  if (!count) return null;
  const partes = DENOMINATIONS.filter(d => count[d] > 0).map(d => `${count[d]}×$${d}`);
  return partes.length ? partes.join(' · ') : null;
}

const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => (
  <th className={`border-b-2 border-black py-1 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const Td = ({ children, right, colSpan }: { children: ReactNode; right?: boolean; colSpan?: number }) => (
  <td className={`border-b border-gray-400 py-1 ${right ? 'text-right tabular' : ''}`} colSpan={colSpan}>{children}</td>
);

/**
 * Reporte de caja para imprimir en A4 (no un ticket térmico): "X" es una
 * foto del turno todavía abierto (no cierra nada, se puede pedir las veces
 * que haga falta); "Z" es el mismo reporte de un turno ya cerrado, con el
 * arqueo completo — incluido el desglose billete por billete de cómo se
 * contó — agregado abajo. Mismo mecanismo que TicketPrint: se imprime solo
 * al recibir un turno.
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
  const branchName = shift.cashRegister?.warehouse?.branch?.name;
  const warehouseName = shift.cashRegister?.warehouse?.name;
  const st = shift.saleTotals;

  return (
    <div className="print-area print-a4 hidden print:block font-sans text-[11px] leading-snug text-black">
      <div className="mb-3 border-b-2 border-black pb-2 text-center">
        <p className="text-lg font-bold">{tenantName}</p>
        {(branchName || warehouseName) && <p className="text-xs">{branchName}{branchName && warehouseName ? ' · ' : ''}{warehouseName}</p>}
        <p className="mt-1 text-sm font-bold uppercase">{cerrado ? 'Cierre de turno — Reporte Z' : 'Reporte X — turno abierto'}</p>
        <p className="text-xs">{shift.cashRegister?.name ?? shift.cashRegisterName ?? 'Caja'}</p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        <span>Abrió: <strong>{shift.openedByName}</strong> · {fechaHora(shift.openedAt)}</span>
        <span>{cerrado ? <>Cerró: <strong>{shift.closedByName}</strong> · {shift.closedAt ? fechaHora(shift.closedAt) : ''}</> : <>Emitido: {fechaHora(new Date().toISOString())}</>}</span>
      </div>

      <p className="mb-1 font-bold uppercase">Resumen de ventas ({shift.salesCount ?? 0})</p>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="border border-black p-1.5"><p className="text-[10px] uppercase text-gray-600">Subtotal</p><p className="font-bold tabular">{money(st?.subtotal ?? 0)}</p></div>
        <div className="border border-black p-1.5"><p className="text-[10px] uppercase text-gray-600">IVA</p><p className="font-bold tabular">{money(st?.taxTotal ?? 0)}</p></div>
        <div className="border border-black p-1.5"><p className="text-[10px] uppercase text-gray-600">Recargos</p><p className="font-bold tabular">{money(st?.surchargeTotal ?? 0)}</p></div>
        <div className="border border-black bg-gray-100 p-1.5"><p className="text-[10px] uppercase text-gray-600">Total facturado</p><p className="font-bold tabular">{money(st?.total ?? 0)}</p></div>
      </div>

      <p className="mb-1 font-bold uppercase">Por medio de pago</p>
      <table className="mb-3 w-full border-collapse text-xs">
        <thead><tr><Th>Medio</Th><Th right>Operaciones</Th><Th right>Total</Th></tr></thead>
        <tbody>
          {(shift.totalsByMethod ?? []).map((t, i) => (
            <tr key={i}><Td>{PAGOS[t.method] ?? t.method}</Td><Td right>{t.count ?? ''}</Td><Td right>{money(t.total)}</Td></tr>
          ))}
          {!shift.totalsByMethod?.length && <tr><Td colSpan={3}>Sin ventas todavía.</Td></tr>}
        </tbody>
      </table>

      {!!shift.totalsByCard?.length && (
        <>
          <p className="mb-1 font-bold uppercase">Detalle por tarjeta (crédito)</p>
          <table className="mb-3 w-full border-collapse text-xs">
            <thead><tr><Th>Tarjeta</Th><Th right>Operaciones</Th><Th right>Total</Th></tr></thead>
            <tbody>
              {shift.totalsByCard.map(t => (
                <tr key={t.cardId}><Td>{t.name}</Td><Td right>{t.count}</Td><Td right>{money(t.total)}</Td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="mb-1 font-bold uppercase">Movimientos de efectivo</p>
      <table className="mb-3 w-full border-collapse text-xs">
        <thead><tr><Th>Hora</Th><Th>Tipo</Th><Th>Motivo</Th><Th>Usuario</Th><Th>Billetes</Th><Th right>Monto</Th></tr></thead>
        <tbody>
          {(shift.movements ?? []).map(m => (
            <tr key={m.id}>
              <Td>{fechaHora(m.occurredAt).split(' ').pop()}</Td>
              <Td>{MOVIMIENTOS[m.type] ?? m.type}</Td>
              <Td>{m.reason}</Td>
              <Td>{m.userName}</Td>
              <Td>{billetesTexto(m.denominations) ?? '—'}</Td>
              <Td right>{m.type === 'withdrawal' || m.type === 'expense' ? '−' : '+'}{money(Number(m.amount))}</Td>
            </tr>
          ))}
          {!shift.movements?.length && <tr><Td colSpan={6}>Ninguno.</Td></tr>}
        </tbody>
      </table>

      <p className="mb-1 font-bold uppercase">Arqueo</p>
      <div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="border border-black p-1.5"><p className="text-[10px] uppercase text-gray-600">Fondo inicial</p><p className="font-bold tabular">{money(Number(shift.openingCash))}</p></div>
        <div className="border border-black p-1.5"><p className="text-[10px] uppercase text-gray-600">{cerrado ? 'Esperado' : 'Esperado ahora'}</p><p className="font-bold tabular">{money(esperado)}</p></div>
        {cerrado ? (
          <>
            <div className="border border-black p-1.5"><p className="text-[10px] uppercase text-gray-600">Contado</p><p className="font-bold tabular">{money(Number(shift.countedCash))}</p></div>
            <div className="border border-black bg-gray-100 p-1.5"><p className="text-[10px] uppercase text-gray-600">Diferencia</p><p className="font-bold tabular">{money(Number(shift.cashDifference))}</p></div>
          </>
        ) : (
          <div className="col-span-2 flex items-center justify-center border border-dashed border-gray-400 p-1.5 text-gray-500">Turno abierto — sin arqueo todavía</div>
        )}
      </div>

      {cerrado && !!shift.cashCount && Object.keys(shift.cashCount).length > 0 && (
        <>
          <p className="mb-1 font-bold uppercase">Desglose del conteo</p>
          <table className="mb-3 w-full border-collapse text-xs">
            <thead><tr><Th>Billete</Th><Th right>Cantidad</Th><Th right>Subtotal</Th></tr></thead>
            <tbody>
              {DENOMINATIONS.filter(d => (shift.cashCount?.[d] ?? 0) > 0).map(d => (
                <tr key={d}><Td>${d}</Td><Td right>{shift.cashCount![d]}</Td><Td right>{money(d * shift.cashCount![d])}</Td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {shift.closingNotes && <p className="mb-3 text-xs"><strong>Notas de cierre:</strong> {shift.closingNotes}</p>}

      <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs">
        <div>
          <div className="border-t border-black pt-1">Firma del cajero</div>
        </div>
        <div>
          <div className="border-t border-black pt-1">Firma del supervisor / responsable</div>
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] text-gray-500">{cerrado ? 'Cierre Z' : 'Reporte parcial — el turno sigue abierto'} · Comprobante interno, no válido como factura</p>
    </div>
  );
}
