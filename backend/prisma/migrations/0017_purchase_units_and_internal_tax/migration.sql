-- Unidad de compra (bulto/caja) y su factor de conversion a la unidad base.
-- Default 1 => los productos existentes se comportan exactamente igual que antes.
ALTER TABLE "products" ADD COLUMN "purchase_unit" TEXT;
ALTER TABLE "products" ADD COLUMN "units_per_purchase" DECIMAL(14,3) NOT NULL DEFAULT 1;
ALTER TABLE "products" ADD COLUMN "internal_tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Factor congelado por linea: las reversiones de una factura tienen que usar el
-- factor con el que se confirmo, no el actual del producto.
ALTER TABLE "purchase_invoice_lines" ADD COLUMN "unit_factor" DECIMAL(14,3) NOT NULL DEFAULT 1;
