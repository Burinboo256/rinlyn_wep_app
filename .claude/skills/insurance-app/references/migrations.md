# Migrations

There is no migration tool — schema lives in `src/lib/db.ts` `init()`. For new installs, `CREATE TABLE IF NOT EXISTS` handles it. For existing `data.db` files, add an idempotent `ALTER TABLE`.

## Adding a column

In `init()` after the `CREATE TABLE` block:

```ts
function safeAddColumn(db: DatabaseSync, table: string, columnDdl: string) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDdl}`); } catch { /* exists */ }
}

safeAddColumn(db, 'customers', 'occupation TEXT');
safeAddColumn(db, 'policies', 'commission_rate REAL DEFAULT 0');
```

Also update the `CREATE TABLE` so fresh installs match.

## Renaming / dropping
SQLite supports `ALTER TABLE ... RENAME COLUMN` (3.25+) and `DROP COLUMN` (3.35+). Both are fine with `node:sqlite` on Node 24. Still wrap in try/catch.

## Backfill
Run a one-off in the seed script or a throwaway `tsx` script. Don't put backfill in `init()` — it runs on every cold start.

## When to wipe instead
If the change is destructive (renaming a NOT NULL column with no default, restructuring), tell the user to `rm -f data.db data.db-wal data.db-shm && npm run seed`. Don't try to be clever in dev.
