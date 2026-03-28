-- Step 2: Update existing ADMIN rows to SUPER_ADMIN and clean up old enum value
UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';

-- Rename old ADMIN enum value so Prisma can manage the enum cleanly.
-- PostgreSQL doesn't support DROP VALUE from enums, so we recreate the type.
DO $$
BEGIN
  -- Only run if the stale 'ADMIN' label still exists
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ADMIN'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
  ) THEN
    -- Create a new enum without ADMIN
    CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'CLIENT_ADMIN', 'WORKER', 'WORKER_TRUST');

    -- Drop default before altering type (default references old enum)
    ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

    -- Swap column type
    ALTER TABLE users
      ALTER COLUMN role TYPE "Role_new" USING role::text::"Role_new";

    -- Drop old, rename new
    DROP TYPE "Role";
    ALTER TYPE "Role_new" RENAME TO "Role";

    -- Restore default
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'WORKER'::"Role";
  END IF;
END $$;
