/** Explicación del módulo Compras para el botón "?" — ver `ModuleScreen`. */
export function ComprasHelp() {
  return (
    <>
      <p>Facturas de proveedor: cargar, corregir, anular. Cada factura confirmada mueve stock; corregirla o anularla revierte el movimiento y, si corresponde, vuelve a mover — nunca se borra.</p>
      <div>
        <h4>Nueva factura</h4>
        <p>Datos del comprobante, líneas de productos con su costo, y otros impuestos (percepciones, impuestos internos) aparte del IVA si la factura los lista.</p>
      </div>
      <div>
        <h4>Pedidos a proveedor</h4>
        <p>Nacen desde Stock → Reposición. No reconcilian cantidades contra la factura: sólo avisan qué se pidió y a quién, hasta que llegue.</p>
      </div>
    </>
  );
}
