#!/usr/bin/env bash
# Wipe the SQLite DB and reseed with sample users/customers/policies.
# Run from the insurance-app/ project root.
set -euo pipefail

if [ ! -f package.json ] || ! grep -q '"insurance-app"' package.json; then
  echo "Run from the insurance-app/ project root." >&2
  exit 1
fi

rm -f data.db data.db-wal data.db-shm
echo "Removed data.db"
npm run seed
