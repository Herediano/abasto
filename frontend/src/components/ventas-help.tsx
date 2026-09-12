/** Explicación del módulo Ventas para el botón "?" — ver `ModuleScreen`. */
export function VentasHelp() {
  return (
    <>
      <p>Comprobantes emitidos en el mostrador, con filtros por fecha, medio de pago y cliente.</p>
      <div>
        <h4>Anular</h4>
        <p>Deja la venta sin efecto y devuelve el stock — sólo si nadie más la tocó después.</p>
      </div>
      <div>
        <h4>Devolver</h4>
        <p>Nota de crédito parcial o total: se elige qué ítems y cuánto se devuelve, y por qué medio se reintegra.</p>
      </div>
    </>
  );
}
