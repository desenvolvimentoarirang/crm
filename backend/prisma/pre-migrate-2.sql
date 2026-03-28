-- Step 2: Migrate ADMIN → SUPER_ADMIN and recreate enum without stale value

-- Update any rows still using old ADMIN value (cast to text to avoid enum validation error)
UPDATE users SET role = 'SUPER_ADMIN'::"Role" WHERE role::text = 'ADMIN';

-- Recreate the enum cleanly: PostgreSQL cannot drop individual enum values,
-- so we create a new type, swap the column, and rename.
-- Guard: only do this if the stale ADMIN label still exists in the enum.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ADMIN'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
  ) THEN
    -- Clean up any leftover from prior failed run
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role_new') THEN
      DROP TYPE "Role_new";
    END IF;

    CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'CLIENT_ADMIN', 'WORKER', 'WORKER_TRUST');

    ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN role TYPE "Role_new" USING role::text::"Role_new";
    DROP TYPE "Role";
    ALTER TYPE "Role_new" RENAME TO "Role";
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'WORKER'::"Role";
  END IF;
END $$;
