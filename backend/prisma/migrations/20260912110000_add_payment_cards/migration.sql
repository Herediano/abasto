-- Tarjetas guardadas con recargo por cantidad de cuotas. Ver PaymentCard /
-- PaymentCardInstallment en schema.prisma.
CREATE TABLE "payment_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_cards_id_tenant_id_key" ON "payment_cards"("id", "tenant_id");

CREATE INDEX "payment_cards_tenant_id_idx" ON "payment_cards"("tenant_id");

CREATE TABLE "payment_card_installments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "installments" INTEGER NOT NULL,
    "surcharge_percent" DECIMAL(6,3) NOT NULL,

    CONSTRAINT "payment_card_installments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_card_installments_tenant_id_card_id_installments_key" ON "payment_card_installments"("tenant_id", "card_id", "installments");

ALTER TABLE "payment_cards" ADD CONSTRAINT "payment_cards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_card_installments" ADD CONSTRAINT "payment_card_installments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_card_installments" ADD CONSTRAINT "payment_card_installments_card_id_tenant_id_fkey" FOREIGN KEY ("card_id", "tenant_id") REFERENCES "payment_cards"("id", "tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sale_payments" ADD COLUMN "card_id" UUID,
ADD COLUMN "installments" INTEGER;

ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_card_id_tenant_id_fkey" FOREIGN KEY ("card_id", "tenant_id") REFERENCES "payment_cards"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
