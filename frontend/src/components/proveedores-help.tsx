/** Explicación del módulo Proveedores para el botón "?" — ver `ModuleScreen`. */
export function ProveedoresHelp() {
  return (
    <>
      <p>A quién le comprás: datos de contacto, cuenta corriente y facturas cargadas.</p>
      <div>
        <h4>Cuenta corriente</h4>
        <p>Cuánto le debemos, con el historial de facturas, pagos y ajustes manuales (notas de crédito/débito).</p>
      </div>
      <div>
        <h4>Desactivar</h4>
        <p>Un proveedor desactivado deja de aparecer para elegir en compras nuevas, pero su historial y sus facturas quedan intactos. Se puede reactivar en cualquier momento.</p>
      </div>
    </>
  );
}
