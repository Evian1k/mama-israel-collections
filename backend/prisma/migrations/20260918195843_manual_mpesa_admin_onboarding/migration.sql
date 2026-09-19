-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'failed';
ALTER TYPE "PaymentStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "payments" JSONB;

-- Backfill: every existing admin is still using the bootstrap password from
-- the environment (no password-change feature existed before this migration),
-- so force the onboarding password change on next login.
UPDATE "AdminUser" SET "mustChangePassword" = true;
