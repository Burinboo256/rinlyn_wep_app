import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

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
