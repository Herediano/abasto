/** Explicación del módulo Clientes para el botón "?" — ver `ModuleScreen`. */
export function ClientesHelp() {
  return (
    <>
      <p>La ficha de cada cliente: datos, cuenta corriente, límite de crédito y qué lista de precios paga.</p>
      <div>
        <h4>Lista de precios</h4>
        <p>Si el cliente no tiene ninguna asignada, paga la lista por defecto de la empresa.</p>
      </div>
      <div>
        <h4>Cuenta corriente</h4>
        <p>Saldo, límite de crédito y el historial de ventas y pagos que lo componen.</p>
      </div>
    </>
  );
}
