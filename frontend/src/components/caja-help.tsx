/** Explicación del módulo Caja (mostrador) para el botón "?" — ver `ModuleScreen`. */
export function CajaHelp() {
  return (
    <>
      <p>Pantalla de cobro en mostrador, a pantalla completa. Los atajos de teclado quedan siempre a la vista abajo del lector.</p>
      <div>
        <h4>Cargar varias unidades</h4>
        <p>Escribiendo "cantidad*código" (ej. 5*7790000000001) en el lector y Enter se cargan esa cantidad de una — no hace falta escanear una por una. Si en cambio se busca el producto por nombre (F3) con una cantidad pendiente, esta sólo completa el código: la carga sigue confirmándose con Enter.</p>
      </div>
      <div>
        <h4>Cobrar</h4>
        <p>Se puede dividir el pago entre varios medios. En efectivo, lo que exceda lo que falta cubrir se muestra como vuelto. En crédito, se puede elegir una tarjeta puntual de la lista guardada (con su propio recargo por cuotas) o dejar el % genérico de la sucursal.</p>
      </div>
      <div>
        <h4>Caja (F7)</h4>
        <p>Movimientos de efectivo (ingresos, retiros, gastos) y cierre de turno. El arqueo se cuenta billete por billete, no se tipea un total.</p>
      </div>
    </>
  );
}
