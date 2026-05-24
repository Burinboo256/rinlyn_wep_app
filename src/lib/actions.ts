'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb } from './db';
import { requireUser, requireSupervisor, hashPassword, verifyPassword } from './auth';
import { getCustomer } from './queries';
import { normalizeThaiId, validateThaiId } from './validators';

function s(v: FormDataEntryValue | null) {
  const t = String(v ?? '').trim();
  return t === '' ? null : t;
}
function n(v: FormDataEntryValue | null) {
  const t = String(v ?? '').trim();
  return t === '' ? 0 : Number(t);
}

async function assertCustomerOwnership(customerId: number) {
  const u = await requireUser();
  const c = getCustomer(customerId);
  if (!c) redirect('/agent');
  if (u.role === 'agent' && c.agent_id !== u.id) redirect('/agent');
  if (u.role === 'supervisor') {
    const owner = getDb().prepare('SELECT supervisor_id, id FROM users WHERE id = ?').get(c.agent_id) as any;
    if (!owner || (owner.supervisor_id !== u.id && owner.id !== u.id)) redirect('/supervisor');
  }
  return { user: u, customer: c };
}

function validateCustomerInput(formData: FormData, excludeId?: number): string | null {
  const nidRaw = String(formData.get('national_id') || '').trim();
  if (nidRaw) {
    if (!validateThaiId(nidRaw)) return 'invalidId';
    const clean = normalizeThaiId(nidRaw);
    const row = excludeId
      ? getDb().prepare('SELECT id FROM customers WHERE national_id = ? AND id != ?').get(clean, excludeId)
      : getDb().prepare('SELECT id FROM customers WHERE national_id = ?').get(clean);
    if (row) return 'dupId';
  }
  return null;
}

// ─── Customer ──────────────────────────────────────────────────────────────

export async function createCustomer(formData: FormData) {
  const u = await requireUser();
  const err = validateCustomerInput(formData);
  if (err) redirect(`/agent/new?e=${err}`);
  const nidRaw = String(formData.get('national_id') || '').trim();
  getDb()
    .prepare(
      `INSERT INTO customers (agent_id, full_name, national_id, dob, phone, email, address, beneficiary, note, next_contact_date)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      u.id,
      String(formData.get('full_name') || '').trim(),
      nidRaw ? normalizeThaiId(nidRaw) : null,
      s(formData.get('dob')),
      s(formData.get('phone')),
      s(formData.get('email')),
      s(formData.get('address')),
      s(formData.get('beneficiary')),
      s(formData.get('note')),
      s(formData.get('next_contact_date'))
    );
  revalidatePath('/agent');
  redirect('/agent');
}

export async function updateCustomer(id: number, formData: FormData) {
  await assertCustomerOwnership(id);
  const err = validateCustomerInput(formData, id);
  if (err) redirect(`/customers/${id}/edit?e=${err}`);
  const nidRaw = String(formData.get('national_id') || '').trim();
  getDb()
    .prepare(
      `UPDATE customers SET full_name=?, national_id=?, dob=?, phone=?, email=?, address=?, beneficiary=?, note=?, next_contact_date=? WHERE id=?`
    )
    .run(
      String(formData.get('full_name') || '').trim(),
      nidRaw ? normalizeThaiId(nidRaw) : null,
      s(formData.get('dob')),
      s(formData.get('phone')),
      s(formData.get('email')),
      s(formData.get('address')),
      s(formData.get('beneficiary')),
      s(formData.get('note')),
      s(formData.get('next_contact_date')),
      id
    );
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function deleteCustomer(id: number) {
  await assertCustomerOwnership(id);
  getDb().prepare('DELETE FROM customers WHERE id = ?').run(id);
  revalidatePath('/agent');
  redirect('/agent');
}

// ─── Policy ──────────────────────────────────────────────────────────────

export async function createPolicy(customerId: number, formData: FormData) {
  await assertCustomerOwnership(customerId);
  getDb()
    .prepare(
      `INSERT INTO policies (customer_id, policy_no, product_name, payment_type, premium, sum_insured, start_date, end_date, status, note)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      customerId,
      s(formData.get('policy_no')),
      String(formData.get('product_name') || '').trim(),
      String(formData.get('payment_type') || '').trim(),
      n(formData.get('premium')),
      n(formData.get('sum_insured')),
      String(formData.get('start_date') || '').trim(),
      String(formData.get('end_date') || '').trim(),
      String(formData.get('status') || 'active'),
      s(formData.get('note'))
    );
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function updatePolicyStatus(
  policyId: number, customerId: number, formData: FormData
) {
  await assertCustomerOwnership(customerId);
  const status = String(formData.get('status') || 'active');
  const lapse_reason = s(formData.get('lapse_reason'));
  getDb()
    .prepare(
      `UPDATE policies SET status=?, status_changed_at=datetime('now'), lapse_reason=? WHERE id=? AND customer_id=? AND deleted_at IS NULL`
    )
    .run(status, lapse_reason, policyId, customerId);
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function softDeletePolicy(policyId: number, customerId: number) {
  await assertCustomerOwnership(customerId);
  getDb()
    .prepare(`UPDATE policies SET deleted_at=datetime('now'), status='cancelled' WHERE id=? AND customer_id=?`)
    .run(policyId, customerId);
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

// ─── Beneficiary ─────────────────────────────────────────────────────────

export async function createBeneficiary(policyId: number, customerId: number, formData: FormData) {
  await assertCustomerOwnership(customerId);
  getDb()
    .prepare(
      `INSERT INTO policy_beneficiaries (policy_id, name, relation, share_pct, phone, note)
       VALUES (?,?,?,?,?,?)`
    )
    .run(
      policyId,
      String(formData.get('name') || '').trim(),
      s(formData.get('relation')),
      n(formData.get('share_pct')) || 100,
      s(formData.get('phone')),
      s(formData.get('note'))
    );
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}#policy-${policyId}`);
}

export async function deleteBeneficiary(beneId: number, policyId: number, customerId: number) {
  await assertCustomerOwnership(customerId);
  getDb()
    .prepare('DELETE FROM policy_beneficiaries WHERE id=? AND policy_id=?')
    .run(beneId, policyId);
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}#policy-${policyId}`);
}

// ─── Contact ─────────────────────────────────────────────────────────────

export async function createContact(customerId: number, formData: FormData) {
  const { user } = await assertCustomerOwnership(customerId);
  getDb()
    .prepare(
      `INSERT INTO customer_contacts (customer_id, contact_date, channel, outcome, note, created_by)
       VALUES (?,?,?,?,?,?)`
    )
    .run(
      customerId,
      String(formData.get('contact_date') || new Date().toISOString().slice(0, 10)),
      String(formData.get('channel') || 'phone'),
      String(formData.get('outcome') || 'contacted'),
      s(formData.get('note')),
      user.id
    );
  const next = s(formData.get('next_contact_date'));
  if (next) {
    getDb().prepare('UPDATE customers SET next_contact_date = ? WHERE id = ?').run(next, customerId);
  }
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deleteContact(contactId: number, customerId: number) {
  await assertCustomerOwnership(customerId);
  getDb().prepare('DELETE FROM customer_contacts WHERE id = ? AND customer_id = ?').run(contactId, customerId);
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

// ─── Team management ─────────────────────────────────────────────────────

export async function createAgent(formData: FormData) {
  const sup = await requireSupervisor();
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  const full_name = String(formData.get('full_name') || '').trim();
  if (!username || !password || !full_name) redirect('/supervisor/team?e=missing');
  const exists = getDb().prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) redirect('/supervisor/team?e=dup');
  const hash = await hashPassword(password);
  getDb()
    .prepare(`INSERT INTO users (username, password_hash, full_name, role, supervisor_id) VALUES (?,?,?,?,?)`)
    .run(username, hash, full_name, 'agent', sup.id);
  revalidatePath('/supervisor/team');
  redirect('/supervisor/team');
}

export async function removeAgent(agentId: number) {
  const sup = await requireSupervisor();
  getDb()
    .prepare('DELETE FROM users WHERE id = ? AND supervisor_id = ? AND role = ?')
    .run(agentId, sup.id, 'agent');
  revalidatePath('/supervisor/team');
  redirect('/supervisor/team');
}

export async function resetAgentPassword(agentId: number, formData: FormData) {
  const sup = await requireSupervisor();
  const password = String(formData.get('password') || '');
  if (!password) redirect('/supervisor/team');
  const hash = await hashPassword(password);
  getDb()
    .prepare('UPDATE users SET password_hash = ? WHERE id = ? AND supervisor_id = ?')
    .run(hash, agentId, sup.id);
  revalidatePath('/supervisor/team');
  redirect('/supervisor/team');
}

// ─── Profile / Change password ────────────────────────────────────────────

export async function changePassword(formData: FormData) {
  const u = await requireUser();
  const current = String(formData.get('current_password') || '');
  const next = String(formData.get('new_password') || '');
  const confirm = String(formData.get('confirm_password') || '');
  if (!current || !next || !confirm) redirect('/profile?e=missing');
  if (next !== confirm) redirect('/profile?e=mismatch');
  if (next.length < 6) redirect('/profile?e=short');
  const row = getDb().prepare('SELECT password_hash FROM users WHERE id = ?').get(u.id) as any;
  const ok = await verifyPassword(current, row.password_hash);
  if (!ok) redirect('/profile?e=wrong');
  const hash = await hashPassword(next);
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, u.id);
  redirect('/profile?ok=1');
}
