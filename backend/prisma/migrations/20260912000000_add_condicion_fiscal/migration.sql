-- Condición frente al IVA de la empresa y de cada cliente. Junto con la letra
-- resuelta en fiscal.util.ts, prepara el terreno para conectar ARCA sin tener
-- que rehacer el modelo de ventas/notas de crédito.
ALTER TABLE "tenants" ADD COLUMN "condicion_fiscal" TEXT NOT NULL DEFAULT 'responsable_inscripto';
ALTER TABLE "customers" ADD COLUMN "condicion_fiscal" TEXT NOT NULL DEFAULT 'consumidor_final';
