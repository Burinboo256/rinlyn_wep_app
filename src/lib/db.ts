import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __db: DatabaseSync | undefined;
}

function init(db: DatabaseSync) {
  db.exec(`PRAGMA journal_mode = WAL;`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('agent','supervisor')),
      supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      national_id TEXT,
      dob TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      beneficiary TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      policy_no TEXT,
      product_name TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      premium REAL DEFAULT 0,
      sum_insured REAL DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_customers_agent ON customers(agent_id);
    CREATE INDEX IF NOT EXISTS idx_policies_customer ON policies(customer_id);
    CREATE INDEX IF NOT EXISTS idx_users_supervisor ON users(supervisor_id);

    CREATE TABLE IF NOT EXISTS customer_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      contact_date TEXT NOT NULL,
      channel TEXT NOT NULL,
      outcome TEXT NOT NULL,
      note TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_customer ON customer_contacts(customer_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_date ON customer_contacts(contact_date);
  `);

  safeAddColumn(db, 'customers', 'next_contact_date TEXT');

  /* policies: soft-delete + lapse workflow */
  safeAddColumn(db, 'policies', 'deleted_at TEXT');
  safeAddColumn(db, 'policies', 'status_changed_at TEXT');
  safeAddColumn(db, 'policies', 'lapse_reason TEXT');

  /* beneficiaries per policy */
  db.exec(`
    CREATE TABLE IF NOT EXISTS policy_beneficiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_id INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      relation TEXT,
      share_pct REAL DEFAULT 100,
      phone TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_bene_policy ON policy_beneficiaries(policy_id);
  `);

  bootstrapDefaultAdmin(db);
}

function bootstrapDefaultAdmin(db: DatabaseSync) {
  const row = db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
  if (row.c > 0) return;

  const username = process.env.INIT_ADMIN_USERNAME || 'boss';
  const password = process.env.INIT_ADMIN_PASSWORD || 'boss123';
  const fullName = process.env.INIT_ADMIN_NAME || 'หัวหน้าทีม (default)';
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role) VALUES (?,?,?,?)'
  ).run(username, hash, fullName, 'supervisor');

  console.log(
    `[insurance-app] No users found — created default supervisor "${username}". ` +
      (process.env.INIT_ADMIN_PASSWORD
        ? 'Password from INIT_ADMIN_PASSWORD env.'
        : 'Default password: boss123 — CHANGE IT IMMEDIATELY.')
  );
}

function safeAddColumn(db: DatabaseSync, table: string, columnDdl: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDdl}`);
  } catch {
    /* column exists */
  }
}

export function getDb(): DatabaseSync {
  if (!global.__db) {
    const db = new DatabaseSync(DB_PATH);
    init(db);
    global.__db = db;
  }
  return global.__db;
}
