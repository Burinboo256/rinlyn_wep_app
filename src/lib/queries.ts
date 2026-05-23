import { getDb } from './db';

export type Customer = {
  id: number;
  agent_id: number;
  full_name: string;
  national_id: string | null;
  dob: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  beneficiary: string | null;
  note: string | null;
  next_contact_date: string | null;
};

export type Policy = {
  id: number;
  customer_id: number;
  policy_no: string | null;
  product_name: string;
  payment_type: string;
  premium: number;
  sum_insured: number;
  start_date: string;
  end_date: string;
  status: string;
  note: string | null;
};

export type Contact = {
  id: number;
  customer_id: number;
  contact_date: string;
  channel: string;
  outcome: string;
  note: string | null;
  created_by: number | null;
  created_at: string;
};

function buildSearch(q: string) {
  const like = `%${q.replace(/[%_]/g, (m) => '\\' + m)}%`;
  return like;
}

export function listCustomersByAgent(agentId: number, opts: { q?: string } = {}) {
  const q = opts.q?.trim();
  const params: any[] = [agentId];
  let where = 'c.agent_id = ?';
  if (q) {
    where += ' AND (c.full_name LIKE ? ESCAPE "\\" OR c.phone LIKE ? ESCAPE "\\" OR c.national_id LIKE ? ESCAPE "\\")';
    const like = buildSearch(q);
    params.push(like, like, like);
  }
  return getDb()
    .prepare(
      `SELECT c.*, COUNT(p.id) as policy_count, COALESCE(SUM(p.premium),0) as total_premium
       FROM customers c LEFT JOIN policies p ON p.customer_id = c.id
       WHERE ${where} GROUP BY c.id ORDER BY c.created_at DESC`
    )
    .all(...params) as (Customer & { policy_count: number; total_premium: number })[];
}

export function listCustomersBySupervisor(supId: number, opts: { q?: string } = {}) {
  const q = opts.q?.trim();
  const params: any[] = [supId, supId];
  let where = '(u.supervisor_id = ? OR u.id = ?)';
  if (q) {
    where += ' AND (c.full_name LIKE ? ESCAPE "\\" OR c.phone LIKE ? ESCAPE "\\" OR c.national_id LIKE ? ESCAPE "\\")';
    const like = buildSearch(q);
    params.push(like, like, like);
  }
  return getDb()
    .prepare(
      `SELECT c.*, u.full_name as agent_name, COUNT(p.id) as policy_count, COALESCE(SUM(p.premium),0) as total_premium
       FROM customers c
       JOIN users u ON u.id = c.agent_id
       LEFT JOIN policies p ON p.customer_id = c.id
       WHERE ${where}
       GROUP BY c.id ORDER BY c.created_at DESC`
    )
    .all(...params) as any[];
}

export function getCustomer(id: number) {
  return getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
}

export function listPoliciesByCustomer(customerId: number) {
  return getDb().prepare('SELECT * FROM policies WHERE customer_id = ? ORDER BY end_date ASC').all(customerId) as Policy[];
}

export function listContactsByCustomer(customerId: number) {
  return getDb()
    .prepare(
      `SELECT cc.*, u.full_name as creator_name
       FROM customer_contacts cc
       LEFT JOIN users u ON u.id = cc.created_by
       WHERE cc.customer_id = ? ORDER BY cc.contact_date DESC, cc.id DESC`
    )
    .all(customerId) as (Contact & { creator_name: string | null })[];
}

export function listAgents(supId: number) {
  return getDb()
    .prepare(
      `SELECT u.*,
              COUNT(DISTINCT c.id) as customer_count,
              COUNT(p.id) as policy_count,
              COALESCE(SUM(p.premium),0) as total_premium,
              MAX(p.created_at) as last_policy_at
       FROM users u
       LEFT JOIN customers c ON c.agent_id = u.id
       LEFT JOIN policies p ON p.customer_id = c.id
       WHERE u.supervisor_id = ? AND u.role = 'agent'
       GROUP BY u.id ORDER BY u.full_name`
    )
    .all(supId) as any[];
}

export function expiringPolicies(scopeAgentIds: number[], days: number) {
  if (scopeAgentIds.length === 0) return [];
  const placeholders = scopeAgentIds.map(() => '?').join(',');
  return getDb()
    .prepare(
      `SELECT p.*, c.full_name as customer_name, c.phone, u.full_name as agent_name
       FROM policies p
       JOIN customers c ON c.id = p.customer_id
       JOIN users u ON u.id = c.agent_id
       WHERE c.agent_id IN (${placeholders})
         AND date(p.end_date) <= date('now', '+${days} days')
         AND date(p.end_date) >= date('now')
       ORDER BY p.end_date ASC`
    )
    .all(...scopeAgentIds) as any[];
}

export function dueContacts(agentIds: number[], horizonDays: number) {
  if (agentIds.length === 0) return [];
  const placeholders = agentIds.map(() => '?').join(',');
  return getDb()
    .prepare(
      `SELECT c.*, u.full_name as agent_name
       FROM customers c
       JOIN users u ON u.id = c.agent_id
       WHERE c.agent_id IN (${placeholders})
         AND c.next_contact_date IS NOT NULL
         AND date(c.next_contact_date) <= date('now', '+${horizonDays} days')
       ORDER BY c.next_contact_date ASC`
    )
    .all(...agentIds) as any[];
}

export function teamSummary(supId: number) {
  const db = getDb();
  const agentIds = (db.prepare('SELECT id FROM users WHERE supervisor_id = ? AND role = ?').all(supId, 'agent') as any[])
    .map((r) => r.id);
  const ids = [...agentIds, supId];
  if (ids.length === 0) return { customers: 0, policies: 0, premium: 0, agentIds: ids };
  const placeholders = ids.map(() => '?').join(',');
  const customers = (db.prepare(`SELECT COUNT(*) c FROM customers WHERE agent_id IN (${placeholders})`).get(...ids) as any).c;
  const row = db
    .prepare(
      `SELECT COUNT(p.id) c, COALESCE(SUM(p.premium),0) prem
       FROM policies p JOIN customers cu ON cu.id = p.customer_id
       WHERE cu.agent_id IN (${placeholders})`
    )
    .get(...ids) as any;
  return { customers, policies: row.c, premium: row.prem, agentIds: ids };
}

export function fypMonthToDate(agentIds: number[]) {
  if (agentIds.length === 0) return { count: 0, premium: 0 };
  const placeholders = agentIds.map(() => '?').join(',');
  const row = getDb()
    .prepare(
      `SELECT COUNT(p.id) c, COALESCE(SUM(p.premium),0) prem
       FROM policies p JOIN customers cu ON cu.id = p.customer_id
       WHERE cu.agent_id IN (${placeholders})
         AND date(p.start_date) >= date('now','start of month')
         AND p.status != 'cancelled'`
    )
    .get(...agentIds) as any;
  return { count: row.c, premium: row.prem };
}

export function idleAgents(supId: number, days: number) {
  return getDb()
    .prepare(
      `SELECT u.id, u.full_name, u.username,
              MAX(p.created_at) as last_policy_at,
              CAST((julianday('now') - julianday(COALESCE(MAX(p.created_at), u.created_at))) AS INTEGER) as days_idle
       FROM users u
       LEFT JOIN customers c ON c.agent_id = u.id
       LEFT JOIN policies p ON p.customer_id = c.id
       WHERE u.supervisor_id = ? AND u.role = 'agent'
       GROUP BY u.id
       HAVING days_idle >= ?
       ORDER BY days_idle DESC`
    )
    .all(supId, days) as any[];
}

export function newPoliciesToday(agentIds: number[]) {
  if (agentIds.length === 0) return 0;
  const placeholders = agentIds.map(() => '?').join(',');
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) c FROM policies p JOIN customers c ON c.id = p.customer_id
       WHERE c.agent_id IN (${placeholders}) AND date(p.created_at) = date('now')`
    )
    .get(...agentIds) as any;
  return row.c as number;
}
