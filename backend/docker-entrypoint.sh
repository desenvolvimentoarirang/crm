#!/bin/sh
set -e

# One-shot hard reset — set RESET_DB=true in Railway env vars, deploy once, then remove it
if [ "$RESET_DB" = "true" ]; then
  echo "RESET_DB=true detected — wiping database and running fresh migrations..."
  npx prisma migrate reset --force
  echo "Reset complete."
  exec node dist/app.js
fi

echo "Running safe database migrations..."

# Check if the DB already has tables (created by old db push) but no migration history.
# If so, baseline the init migration so migrate deploy doesn't try to recreate tables.
TABLE_EXISTS=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$queryRawUnsafe(\"SELECT 1 FROM information_schema.tables WHERE table_name='users' LIMIT 1\")
    .then(r => { console.log(r.length > 0 ? 'yes' : 'no'); p.\$disconnect(); })
    .catch(() => { console.log('no'); p.\$disconnect(); });
" 2>/dev/null || echo "no")

MIGRATION_EXISTS=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$queryRawUnsafe(\"SELECT 1 FROM _prisma_migrations WHERE migration_name='20260320000000_init' LIMIT 1\")
    .then(r => { console.log(r.length > 0 ? 'yes' : 'no'); p.\$disconnect(); })
    .catch(() => { console.log('no'); p.\$disconnect(); });
" 2>/dev/null || echo "no")

if [ "$TABLE_EXISTS" = "yes" ] && [ "$MIGRATION_EXISTS" != "yes" ]; then
  echo "Existing database detected — baselining init migration..."
  npx prisma migrate resolve --applied 20260320000000_init
fi

# Apply only pending migrations — NEVER drops data
npx prisma migrate deploy

# Seed is idempotent (uses upserts) — safe to run every time
npx tsx prisma/seed.ts
echo "Migrations and seed complete."

exec node dist/app.js
