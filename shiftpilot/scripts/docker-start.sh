#!/bin/sh
# Container entrypoint: create/update the schema, seed demo data on first
# boot (unless SEED_DEMO_DATA=false), then serve.
set -e

echo "ShiftPilot: syncing database schema…"
npx prisma db push

node scripts/seed-if-empty.mjs

echo "ShiftPilot: starting on port ${PORT:-3000}"
exec npm start
