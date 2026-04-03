-- Add isGroup column to contacts if it doesn't exist
-- Needed for Railway deployments where DB was created before this column was added to the schema
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "isGroup" BOOLEAN NOT NULL DEFAULT false;
