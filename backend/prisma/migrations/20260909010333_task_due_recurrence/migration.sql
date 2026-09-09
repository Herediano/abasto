-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "due_at" TIMESTAMPTZ(6),
ADD COLUMN     "recurrence" TEXT;
