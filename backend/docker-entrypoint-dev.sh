#!/bin/sh
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Running database migrations (dev)..."
npx prisma migrate deploy

echo "Running seed..."
npx tsx prisma/seed.ts

echo "Migrations and seed complete — starting dev server..."
exec npm run dev
