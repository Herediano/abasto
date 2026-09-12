/** Explicación del módulo Depósitos para el botón "?" — ver `ModuleScreen`. */
export function DepositosHelp() {
  return (
    <>
      <p>Dónde se guarda el stock de cada sucursal. Cada sucursal nace con un depósito y una caja; acá se agregan depósitos extra si hacen falta.</p>
      <div>
        <h4>Cajas</h4>
        <p>Cada depósito puede tener sus propias cajas registradoras, desde donde se abren los turnos de venta.</p>
      </div>
      <div>
        <h4>Desactivar</h4>
        <p>No se puede desactivar un depósito que tiene caja (es el operativo de su sucursal) ni con usuarios asignados — hay que reasignarlos primero.</p>
      </div>
    </>
  );
}
