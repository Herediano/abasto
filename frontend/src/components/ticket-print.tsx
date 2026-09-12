import { useEffect } from 'react';
import { fechaHora, money } from '@/lib/format';

const PAGOS: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', card_debit: 'Débito', card_credit: 'Crédito', transfer: 'Transferencia', qr: 'QR', account: 'Cuenta corriente' };

export type TicketData = {
  docType: string;
  pointOfSale: string;
  number: number;
  occurredAt: string;
  customerName?: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  surchargeTotal?: string;
  lines: Array<{ description: string; quantity: string; unitPrice: string; lineTotal: string }>;
  /** `label` pisa el nombre genérico del medio — p. ej. la tarjeta puntual usada, con sus cuotas. */
  payments: Array<{ method: string; amount: string; label?: string }>;
  /** Sólo si se pagó (total o parcialmente) en efectivo con vuelto. */
  cashReceived?: number;
  change?: number;
};

/**
 * El ticket queda montado (oculto en pantalla, `hidden print:block` +
 * `.print-ticket` en styles.css) mientras haya un `ticket` cargado: se
 * imprime solo al recibir uno nuevo, y se puede reimprimir después con un
 * botón propio que llama a `window.print()` directo — el ticket ya está en
 * el DOM, no hace falta volver a pedir nada.
 */
export function TicketPrint({ ticket, tenantName }: { ticket: TicketData | null; tenantName: string }) {
  useEffect(() => {
    if (!ticket) return;
    // Un frame de margen para que el ticket ya esté pintado antes de abrir el diálogo.
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [ticket]);

  if (!ticket) return null;
  const letra = ticket.docType.length === 1 ? ticket.docType : null;
  const numero = `${ticket.pointOfSale}-${String(ticket.number).padStart(8, '0')}`;

  return (
    <div className="print-area print-ticket hidden print:block font-mono text-[11px] leading-snug text-black">
      <p className="text-center text-sm font-bold">{tenantName}</p>
      <p className="text-center">{letra ? `Comprobante ${letra}` : 'Comprobante interno'} {numero}</p>
      <p className="text-center">{fechaHora(ticket.occurredAt)}</p>
      {ticket.customerName && <p>Cliente: {ticket.customerName}</p>}
      <hr className="my-1 border-black" />
      {ticket.lines.map((l, i) => (
        <div key={i} className="mb-0.5">
          <div>{l.description}</div>
          <div className="flex justify-between">
            <span>{l.quantity} x {money(Number(l.unitPrice))}</span>
            <span>{money(Number(l.lineTotal))}</span>
          </div>
        </div>
      ))}
      <hr className="my-1 border-black" />
      <div className="flex justify-between"><span>Subtotal</span><span>{money(Number(ticket.subtotal))}</span></div>
      <div className="flex justify-between"><span>IVA</span><span>{money(Number(ticket.taxTotal))}</span></div>
      {Number(ticket.surchargeTotal ?? 0) !== 0 && (
        <div className="flex justify-between"><span>Recargo/desc.</span><span>{money(Number(ticket.surchargeTotal))}</span></div>
      )}
      <div className="flex justify-between text-sm font-bold"><span>Total</span><span>{money(Number(ticket.total))}</span></div>
      <hr className="my-1 border-black" />
      {ticket.payments.map((p, i) => (
        <div key={i} className="flex justify-between"><span>{p.label ?? PAGOS[p.method] ?? p.method}</span><span>{money(Number(p.amount))}</span></div>
      ))}
      {ticket.change != null && (
        <>
          <div className="flex justify-between"><span>Recibido</span><span>{money(ticket.cashReceived ?? 0)}</span></div>
          <div className="flex justify-between font-bold"><span>Vuelto</span><span>{money(ticket.change)}</span></div>
        </>
      )}
      <p className="mt-2 text-center">
        {letra ? 'CAE pendiente — comprobante no válido como factura' : 'Comprobante no fiscal'}
      </p>
    </div>
  );
}
