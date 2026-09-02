CREATE TYPE "UserRole" AS ENUM ('admin', 'user');
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'user';

WITH first_users AS (
  SELECT DISTINCT ON ("tenant_id") "id"
  FROM "users"
  ORDER BY "tenant_id", "created_at" ASC
)
UPDATE "users" SET "role" = 'admin'::"UserRole"
WHERE "id" IN (SELECT "id" FROM first_users);
