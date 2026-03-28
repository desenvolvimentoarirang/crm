-- Step 2: Update existing ADMIN rows to SUPER_ADMIN (must be separate transaction)
UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';
