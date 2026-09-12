/**
 * Estructura fiscal, preparada para conectar ARCA (WSFEv1 o un tercero) más
 * adelante sin rehacer nada de esto — hoy no hay ninguna conexión real, todo
 * lo de acá corre sin salir del proceso.
 *
 * Dos condiciones frente al IVA entran en juego, y son cosas distintas:
 *   - Tenant.condicionFiscal: la de LA EMPRESA que vende.
 *   - Customer.condicionFiscal: la del cliente (o "consumidor_final" si no
 *     hay cliente cargado — el caso de mostrador).
 * De esas dos sale la letra del comprobante.
 */

export type TenantCondicionFiscal = 'responsable_inscripto' | 'monotributista' | 'exento';
export type CustomerCondicionFiscal = 'responsable_inscripto' | 'monotributista' | 'exento' | 'consumidor_final';

export const TENANT_CONDICIONES_FISCALES: TenantCondicionFiscal[] = ['responsable_inscripto', 'monotributista', 'exento'];
export const CUSTOMER_CONDICIONES_FISCALES: CustomerCondicionFiscal[] = ['responsable_inscripto', 'monotributista', 'exento', 'consumidor_final'];

/**
 * Letra del comprobante de venta. Regla simplificada (no es asesoramiento
 * impositivo, es el punto de partida hasta que se conecte ARCA de verdad):
 *   - Responsable Inscripto que le vende a otro Responsable Inscripto → A.
 *   - Responsable Inscripto que le vende a cualquier otra condición → B.
 *   - Monotributista o Exento → C, sea quien sea el comprador (no discriminan IVA).
 */
export function resolveComprobanteType(tenant: TenantCondicionFiscal, customer: CustomerCondicionFiscal): 'A' | 'B' | 'C' {
  if (tenant !== 'responsable_inscripto') return 'C';
  return customer === 'responsable_inscripto' ? 'A' : 'B';
}

export type FiscalAuthorization = { cae: string | null; caeExpiresAt: Date | null };

/**
 * El único lugar que va a cambiar cuando se conecte ARCA: hoy no autoriza
 * nada, deja el comprobante "interno" (cae null — así lo muestra la UI: "CAE
 * pendiente"). El día que haya WSFEv1 o un proveedor tercero, esta función
 * pasa a hacer el llamado real y devolver el CAE/vencimiento que responda; el
 * resto del sistema (numeración, letra, líneas) no cambia.
 */
export async function authorizeFiscal(_sale: { tenantId: string; docType: string; pointOfSale: string; number: number }): Promise<FiscalAuthorization> {
  return { cae: null, caeExpiresAt: null };
}
