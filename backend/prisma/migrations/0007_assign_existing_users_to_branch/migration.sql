UPDATE "users" u
SET "warehouse_id" = (
  SELECT w."id" FROM "warehouses" w
  WHERE w."tenant_id" = u."tenant_id"
  ORDER BY w."created_at" ASC
  LIMIT 1
)
WHERE u."warehouse_id" IS NULL
  AND EXISTS (SELECT 1 FROM "warehouses" w2 WHERE w2."tenant_id" = u."tenant_id");
