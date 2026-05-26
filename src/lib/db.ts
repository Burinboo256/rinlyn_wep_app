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

  /* products catalogue */
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'life',
      default_commission_rate REAL DEFAULT 20,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  /* commission on policies */
  safeAddColumn(db, 'policies', 'commission_type TEXT DEFAULT "FYC"');
  safeAddColumn(db, 'policies', 'commission_rate REAL DEFAULT 0');
  safeAddColumn(db, 'policies', 'commission_amount REAL DEFAULT 0');

  /* agent licence */
  safeAddColumn(db, 'users', 'license_no TEXT');
  safeAddColumn(db, 'users', 'license_expiry TEXT');

  /* claims */
  db.exec(`
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_id INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
      claim_date TEXT NOT NULL,
      claim_type TEXT NOT NULL,
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      note TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      resolved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_claims_policy ON claims(policy_id);
  `);

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

  const supRow = db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role) VALUES (?,?,?,?)'
  ).run(username, hash, fullName, 'supervisor');
  const supId = supRow.lastInsertRowid;

  /* seed sample agents (ลบทิ้งได้ภายหลังผ่านหน้า /supervisor/team) */
  const agentHash = bcrypt.hashSync('agent123', 10);
  db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role, supervisor_id) VALUES (?,?,?,?,?)'
  ).run('agent1', agentHash, 'ตัวแทน สมหญิง (ตัวอย่าง)', 'agent', supId);
  db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role, supervisor_id) VALUES (?,?,?,?,?)'
  ).run('agent2', agentHash, 'ตัวแทน วิชัย (ตัวอย่าง)', 'agent', supId);

  /* seed starter products */
  const prodCount = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as any).c;
  if (prodCount === 0) {
    const insertProd = db.prepare(
      'INSERT OR IGNORE INTO products (code, name, category, default_commission_rate) VALUES (?,?,?,?)'
    );
    [
      ['WL001', 'ประกันชีวิตตลอดชีพ', 'life', 25],
      ['EN001', 'ประกันสะสมทรัพย์ 10/5', 'life', 20],
      ['EN002', 'ประกันสะสมทรัพย์ 20/10', 'life', 20],
      ['TM001', 'ประกันชีวิตชั่วระยะเวลา 10 ปี', 'life', 30],
      ['AN001', 'ประกันบำนาญ', 'annuity', 15],
      ['HL001', 'ประกันสุขภาพรายปี', 'health', 20],
      ['CI001', 'ประกันโรคร้ายแรง', 'health', 25],
      ['PA001', 'ประกันอุบัติเหตุ (PA)', 'pa', 20],
    ].forEach(([code, name, cat, rate]) => insertProd.run(code, name, cat, rate));
  }

  console.log(
    `[insurance-app] Fresh DB — created:\n` +
    `  supervisor : ${username} / ${process.env.INIT_ADMIN_PASSWORD ? '(from env)' : 'boss123'}\n` +
    `  agent1     : agent1 / agent123  (ตัวอย่าง — เปลี่ยนรหัสได้ที่ /supervisor/team)\n` +
    `  agent2     : agent2 / agent123  (ตัวอย่าง)\n` +
    (!process.env.INIT_ADMIN_PASSWORD ? '  ⚠️  เปลี่ยนรหัสผ่าน boss ทันทีหลัง login!' : '')
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
