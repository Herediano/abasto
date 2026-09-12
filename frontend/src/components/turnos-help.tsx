/** Explicación del módulo Turnos de caja para el botón "?" — ver `ModuleScreen`. */
export function TurnosHelp() {
  return (
    <>
      <p>Todos los turnos de caja de la sucursal: quién abrió y cerró cada uno, con qué fondo y qué diferencia dejó el arqueo. El cajero ve el suyo desde la propia pantalla de Caja (F7); esto es la vista de supervisión.</p>
      <div>
        <h4>Cerrar turno ajeno</h4>
        <p>Si un cajero quedó con el turno abierto, quien puede ver todas las cajas puede hacerle el arqueo y cerrarlo desde acá — mismo procedimiento de conteo billete por billete que en la caja.</p>
      </div>
      <div>
        <h4>Imprimir</h4>
        <p>Reporte X (turno abierto, se puede pedir las veces que haga falta) o Z (cierre con arqueo completo) en hoja A4.</p>
      </div>
    </>
  );
}
