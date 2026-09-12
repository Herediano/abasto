-- Bonificación de la línea de compra (ej. "10+1" ≈ 9.09%, o el % que la
-- factura ya trae). unit_cost sigue siendo el precio de lista; el costo
-- efectivo sale de aplicarle este descuento.
ALTER TABLE "purchase_invoice_lines" ADD COLUMN "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;
