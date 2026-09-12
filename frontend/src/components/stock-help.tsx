/** Explicación del módulo Stock para el botón "?" — ver `ModuleScreen`. */
export function StockHelp() {
  return (
    <>
      <p>Existencias por producto, depósito y lote. Seis pestañas, todas del mismo módulo.</p>
      <div>
        <h4>Actual</h4>
        <p>Cuánto hay de cada producto, en qué depósito y en qué lote (si el producto maneja vencimiento).</p>
      </div>
      <div>
        <h4>Reposición</h4>
        <p>Productos por debajo del mínimo configurado, con la cantidad sugerida para volver al máximo. Desde acá se genera el pedido a proveedor.</p>
      </div>
      <div>
        <h4>Vencimientos</h4>
        <p>Lotes por vencer u ya vencidos, ordenados por urgencia. El ícono de baja precarga el egreso con motivo "Vencido".</p>
      </div>
      <div>
        <h4>Egreso</h4>
        <p>Ajuste manual de stock (merma, rotura u otro) — no para ventas ni transferencias, que ya tienen su propio flujo.</p>
      </div>
      <div>
        <h4>Transferir</h4>
        <p>Mover mercadería de un depósito a otro, dentro o entre sucursales.</p>
      </div>
      <div>
        <h4>Historial</h4>
        <p>Todos los movimientos de stock: compras, ventas, ajustes y transferencias, con filtros por depósito, tipo y fecha.</p>
      </div>
    </>
  );
}
