-- Clave de idempotencia por venta: si el POS reintenta un cobro con la misma
-- clave (se cortó la conexión justo después de confirmar), se devuelve la
-- venta ya creada en vez de duplicarla. Ver SalesService.create.
ALTER TABLE "sales" ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "sales_tenant_id_idempotency_key_key" ON "sales"("tenant_id", "idempotency_key");
