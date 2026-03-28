-- Step: Add SUPER_ADMIN to enum if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUPER_ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
      ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
    END IF;
  END IF;
END $$;
