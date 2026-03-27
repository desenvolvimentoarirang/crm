-- CreateEnum
CREATE TYPE "ConversationCategory" AS ENUM ('INQUIRY', 'BOOKING', 'SUPPORT', 'COMPLAINT', 'GENERAL');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'VIP');

-- AlterEnum: Add new values first, migrate data, then recreate without old values
-- Step 1: Add new values to existing Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CLIENT_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WORKER_TRUST';

-- Step 2: Migrate existing ADMIN users to SUPER_ADMIN
UPDATE "users" SET "role" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';

-- Step 3: Recreate enum without ADMIN
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'CLIENT_ADMIN', 'WORKER', 'WORKER_TRUST');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'WORKER';
COMMIT;

-- AlterTable: contacts
ALTER TABLE "contacts" ADD COLUMN "isVip" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: conversations
ALTER TABLE "conversations" ADD COLUMN "category" "ConversationCategory" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "clientAdminId" TEXT,
ADD COLUMN "firstResponseAt" TIMESTAMP(3),
ADD COLUMN "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "slaDeadline" TIMESTAMP(3);

-- AlterTable: users
ALTER TABLE "users" ADD COLUMN "clientAdminId" TEXT;

-- AlterTable: whatsapp_instances
ALTER TABLE "whatsapp_instances" ADD COLUMN "clientAdminId" TEXT;

-- CreateIndex
CREATE INDEX "conversations_clientAdminId_idx" ON "conversations"("clientAdminId");
CREATE INDEX "users_clientAdminId_idx" ON "users"("clientAdminId");
CREATE INDEX "whatsapp_instances_clientAdminId_idx" ON "whatsapp_instances"("clientAdminId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientAdminId_fkey" FOREIGN KEY ("clientAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_clientAdminId_fkey" FOREIGN KEY ("clientAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_clientAdminId_fkey" FOREIGN KEY ("clientAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Clear refresh tokens to force re-login after role changes
DELETE FROM "refresh_tokens";
