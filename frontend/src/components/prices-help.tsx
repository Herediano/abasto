/** Explicación del módulo Precios para el botón "?" — ver `ModuleScreen`. */
export function PricesHelp() {
  return (
    <>
      <p>Listas, reglas de actualización, promociones y etiquetas. Seis pestañas, todas del mismo módulo.</p>
      <div>
        <h4>Listas</h4>
        <p>Una lista de precios es a quién se le cobra ese precio: mostrador, mayorista, distribuidor. Se le asigna a un cliente en su ficha; el que no tiene ninguna paga la lista por defecto.</p>
      </div>
      <div>
        <h4>Actualizar</h4>
        <p>Aumentos o recálculos masivos, por lista y por filtro de productos: elegís a quiénes afecta, qué operación aplicarles (porcentaje, redondeo, escalones por cantidad) y revisás el resultado antes de confirmar — nada se guarda hasta aplicar. Las selecciones se pueden guardar para repetirlas después.</p>
      </div>
      <div>
        <h4>Promociones</h4>
        <p>Se configuran acá y se aplican solas en la caja mientras estén vigentes. F6 en la caja lista las ofertas del momento. El orden importa: si dos promociones pegan sobre el mismo producto, gana la primera de la lista.</p>
      </div>
      <div>
        <h4>Etiquetas</h4>
        <p>Imprimir etiquetas de góndola con el precio de lista de hoy (las de promoción quedan para más adelante).</p>
      </div>
      <div>
        <h4>Calendario</h4>
        <p>Línea de tiempo con lo que ya está cargado en Actualizar y Promociones: qué precio cambia y cuándo. No se carga nada nuevo desde acá.</p>
      </div>
      <div>
        <h4>Historial</h4>
        <p>Auditoría de cada cambio de precio, con origen y quién lo hizo. Sólo lectura.</p>
      </div>
    </>
  );
}
