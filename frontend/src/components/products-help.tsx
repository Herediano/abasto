/** Explicación del módulo Productos para el botón "?" — ver `ModuleScreen`. */
export function ProductsHelp() {
  return (
    <>
      <p>El catálogo de la empresa: qué se vende, a qué costo y a qué precio.</p>
      <div>
        <h4>Ficha del producto</h4>
        <p>General: datos, código de barras y si maneja vencimiento o es pesable. Stock: mínimo/máximo para Reposición, proveedores que lo venden (la ★ marca a quién pedirle, no siempre el más barato) y si es un kit/combo armado con otros productos. Precios: costo y precio de venta de la lista base — las demás listas se cargan desde el módulo Precios.</p>
      </div>
      <div>
        <h4>Categorías</h4>
        <p>Agrupan productos para filtrar y organizar el catálogo.</p>
      </div>
    </>
  );
}
