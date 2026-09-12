-- Preset elegido en el alta (kiosco / mayorista): decide qué rangos de
-- fábrica nacen con la empresa. Ver PLANTILLAS en permissions.catalog.ts.
ALTER TABLE "tenants" ADD COLUMN "plantilla" TEXT NOT NULL DEFAULT 'mayorista';
