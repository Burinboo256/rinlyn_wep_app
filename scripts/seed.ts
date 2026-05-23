import { getDb } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) c FROM users').get() as any).c;
  if (count > 0) {
    console.log('Users already exist, skipping seed.');
    return;
  }
  const supHash = await bcrypt.hash('boss123', 10);
  const agHash = await bcrypt.hash('agent123', 10);
  const sup = db
    .prepare(`INSERT INTO users (username, password_hash, full_name, role) VALUES (?,?,?,?)`)
    .run('boss', supHash, 'หัวหน้าทีม สมชาย', 'supervisor');
  const supId = Number(sup.lastInsertRowid);

  const a1 = db
    .prepare(`INSERT INTO users (username, password_hash, full_name, role, supervisor_id) VALUES (?,?,?,?,?)`)
    .run('agent1', agHash, 'ตัวแทน สมหญิง', 'agent', supId);
  const a1Id = Number(a1.lastInsertRowid);
  db.prepare(`INSERT INTO users (username, password_hash, full_name, role, supervisor_id) VALUES (?,?,?,?,?)`)
    .run('agent2', agHash, 'ตัวแทน วิชัย', 'agent', supId);

  const c = db
    .prepare(
      `INSERT INTO customers (agent_id, full_name, national_id, phone, email, beneficiary)
       VALUES (?,?,?,?,?,?)`
    )
    .run(a1Id, 'นายทดสอบ ระบบ', '1234567890123', '0812345678', 'test@example.com', 'นางทดสอบ ระบบ');
  const cid = Number(c.lastInsertRowid);

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const inDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

  db.prepare(
    `INSERT INTO policies (customer_id, policy_no, product_name, payment_type, premium, sum_insured, start_date, end_date)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(cid, 'P-0001', 'ประกันชีวิตตลอดชีพ 99/20', 'รายปี', 24000, 1000000, fmt(today), inDays(20));
  db.prepare(
    `INSERT INTO policies (customer_id, policy_no, product_name, payment_type, premium, sum_insured, start_date, end_date)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(cid, 'P-0002', 'ประกันสะสมทรัพย์ 10/5', 'รายปี', 50000, 500000, fmt(today), inDays(365));

  console.log('✅ Seeded.');
  console.log('  หัวหน้า: boss / boss123');
  console.log('  ตัวแทน:  agent1 / agent123  หรือ  agent2 / agent123');
}

main();
