/** Explicación del módulo Reportes para el botón "?" — ver `ModuleScreen`. */
export function ReportesHelp() {
  return (
    <>
      <p>Ventas, márgenes, más vendidos y arqueos, por el rango de fechas elegido arriba.</p>
      <div>
        <h4>Sucursales</h4>
        <p>Quien puede navegar sucursales ve el consolidado de todas por defecto, con un selector para acotar a una puntual. Quien no, sólo ve la suya.</p>
      </div>
      <div>
        <h4>Ventas</h4>
        <p>Por medio de pago, por cajero, comparativa entre sucursales (siempre muestra todas, sea cual sea el filtro elegido) y más vendidos. "Sin rotación" son productos con stock que no se vendieron ni una vez en el rango — plata parada en la góndola.</p>
      </div>
      <div>
        <h4>Caja</h4>
        <p>Turnos que cerraron con diferencia entre lo esperado y lo contado.</p>
      </div>
      <div>
        <h4>Cuentas</h4>
        <p>Clientes con saldo pendiente en cuenta corriente.</p>
      </div>
    </>
  );
}
