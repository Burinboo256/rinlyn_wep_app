import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import Shell from '@/components/Shell';
import {
  getCustomer, listPoliciesByCustomer, listContactsByCustomer,
  listBeneficiariesByPolicy,
} from '@/lib/queries';
import { getDb } from '@/lib/db';
import PolicyForm from '@/components/PolicyForm';
import ContactForm from '@/components/ContactForm';
import {
  createPolicy, softDeletePolicy, updatePolicyStatus,
  deleteCustomer, createContact, deleteContact,
  createBeneficiary, deleteBeneficiary,
} from '@/lib/actions';

const channelLabel: Record<string, string> = {
  phone: '📞 โทร', line: '💬 LINE', email: '📧 อีเมล', meeting: '🤝 เจอตัว', other: 'อื่นๆ',
};
const outcomeLabel: Record<string, string> = {
  contacted: '✅ ติดต่อได้', no_answer: '📵 ไม่รับสาย', reschedule: '📅 นัดใหม่',
  renewed: '🎉 ต่ออายุแล้ว', not_interested: '❌ ไม่สนใจ', follow_up: '🔄 รอติดตาม',
};
const statusLabel: Record<string, string> = {
  active: 'มีผล', lapsed: 'ขาดอายุ', cancelled: 'ยกเลิก',
};
const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  lapsed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default async function CustomerDetail({ params }: { params: { id: string } }) {
  const u = await requireUser();
  const id = Number(params.id);
  const c = getCustomer(id);
  if (!c) notFound();

  if (u.role === 'agent' && c.agent_id !== u.id) redirect('/agent');
  if (u.role === 'supervisor') {
    const owner = getDb().prepare('SELECT supervisor_id, id FROM users WHERE id = ?').get(c.agent_id) as any;
    if (!owner || (owner.supervisor_id !== u.id && owner.id !== u.id)) redirect('/supervisor');
  }

  const policies = listPoliciesByCustomer(id);
  const contacts = listContactsByCustomer(id);
  const today = new Date().toISOString().slice(0, 10);
  const back = u.role === 'supervisor' ? '/supervisor/customers' : '/agent';

  const nextDue = c.next_contact_date;
  const overdue = nextDue && nextDue < today;
  const dueSoon = nextDue && !overdue && nextDue <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  // pre-load beneficiaries for each policy
  const beneMap: Record<number, any[]> = {};
  for (const p of policies) {
    beneMap[p.id] = listBeneficiariesByPolicy(p.id);
  }

  return (
    <Shell user={u} nav={[{ href: back, label: '← กลับ' }]}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{c.full_name}</h1>
          <p className="text-slate-500 text-sm">{c.phone || '-'} · {c.email || '-'}</p>
          {nextDue && (
            <p className="text-sm mt-1">
              นัดติดต่อ:{' '}
              <span className={`badge ${overdue ? 'bg-red-100 text-red-700' : dueSoon ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                {nextDue}{overdue && ' (เลยกำหนด)'}
              </span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/customers/${id}/edit`} className="btn-ghost">แก้ไข</Link>
          {u.role === 'agent' && (
            <form action={async () => { 'use server'; await deleteCustomer(id); }}>
              <button className="btn-danger" type="submit"
                onClick={undefined}
                formAction={async (fd: FormData) => { 'use server'; await deleteCustomer(id); }}>
                ลบลูกค้า
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold mb-2">ข้อมูลส่วนตัว</h3>
          <dl className="text-sm space-y-1">
            <div><dt className="inline text-slate-500">เลขบัตร: </dt><dd className="inline">{c.national_id || '-'}</dd></div>
            <div><dt className="inline text-slate-500">วันเกิด: </dt><dd className="inline">{c.dob || '-'}</dd></div>
            <div><dt className="inline text-slate-500">ที่อยู่: </dt><dd className="inline">{c.address || '-'}</dd></div>
            <div><dt className="inline text-slate-500">หมายเหตุ: </dt><dd className="inline">{c.note || '-'}</dd></div>
          </dl>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">สรุป</h3>
          <p className="text-sm">กรมธรรม์มีผล: <b>{policies.filter(p => p.status === 'active').length}</b></p>
          <p className="text-sm">เบี้ยรวม: <b>{policies.reduce((s, p) => s + p.premium, 0).toLocaleString()}</b> ฿</p>
          <p className="text-sm">ทุนรวม: <b>{policies.reduce((s, p) => s + p.sum_insured, 0).toLocaleString()}</b> ฿</p>
          <p className="text-sm mt-2">การติดต่อล่าสุด: <b>{contacts[0]?.contact_date || '-'}</b></p>
        </div>
      </div>

      {/* Policies */}
      <h2 className="text-xl font-bold mb-2">กรมธรรม์ ({policies.length})</h2>
      {policies.map((p) => {
        const expiring = p.status === 'active' && p.end_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) && p.end_date >= today;
        const expired = p.status === 'active' && p.end_date < today;
        const benes = beneMap[p.id] || [];
        return (
          <div key={p.id} id={`policy-${p.id}`} className="card mb-4">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <span className={`badge ${statusColor[p.status] || 'bg-slate-100 text-slate-600'} mr-2`}>{statusLabel[p.status] || p.status}</span>
                <b>{p.product_name}</b>
                {p.policy_no && <span className="text-slate-400 text-xs ml-2">#{p.policy_no}</span>}
                {expiring && <span className="badge bg-amber-100 text-amber-700 ml-2">ใกล้หมดอายุ</span>}
                {expired && <span className="badge bg-red-100 text-red-700 ml-2">หมดอายุ</span>}
              </div>
              <div className="flex gap-2">
                {/* Change status dropdown form */}
                <form action={async (fd: FormData) => { 'use server'; await updatePolicyStatus(p.id, id, fd); }}
                  className="flex gap-1 items-center">
                  <select name="status" defaultValue={p.status} className="input !py-1 !px-2 text-xs w-28">
                    <option value="active">มีผล</option>
                    <option value="lapsed">ขาดอายุ</option>
                    <option value="cancelled">ยกเลิก</option>
                  </select>
                  <input name="lapse_reason" className="input !py-1 !px-2 text-xs w-28" placeholder="เหตุผล (ถ้ามี)" />
                  <button className="btn-ghost !py-1 text-xs">บันทึก</button>
                </form>
                <form action={async () => { 'use server'; await softDeletePolicy(p.id, id); }}>
                  <button className="btn-danger !py-1 text-xs"
                    onClick={undefined}>ลบ</button>
                </form>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-x-6 gap-y-1 mt-3 text-sm">
              <div><span className="text-slate-500">การชำระ: </span>{p.payment_type}</div>
              <div><span className="text-slate-500">เบี้ย: </span><b>{p.premium.toLocaleString()}</b> ฿</div>
              <div><span className="text-slate-500">ทุน: </span><b>{p.sum_insured.toLocaleString()}</b> ฿</div>
              <div><span className="text-slate-500">เริ่ม: </span>{p.start_date}</div>
              <div><span className="text-slate-500">หมดอายุ: </span>{p.end_date}</div>
              {p.status_changed_at && <div><span className="text-slate-500">เปลี่ยนสถานะ: </span>{p.status_changed_at.slice(0, 10)}</div>}
              {p.lapse_reason && <div className="md:col-span-2"><span className="text-slate-500">เหตุผล: </span>{p.lapse_reason}</div>}
              {p.note && <div className="md:col-span-4"><span className="text-slate-500">หมายเหตุ: </span>{p.note}</div>}
            </div>

            {/* Beneficiaries */}
            <div className="mt-4 border-t pt-3">
              <p className="text-sm font-semibold mb-2">ผู้รับผลประโยชน์</p>
              {benes.length === 0 ? (
                <p className="text-xs text-slate-400 mb-2">ยังไม่ระบุ</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-2">
                  {benes.map((b) => (
                    <div key={b.id} className="text-xs bg-slate-50 border rounded px-2 py-1 flex items-center gap-2">
                      <span><b>{b.name}</b>{b.relation && ` (${b.relation})`} — {b.share_pct}%{b.phone && ` · ${b.phone}`}</span>
                      <form action={async () => { 'use server'; await deleteBeneficiary(b.id, p.id, id); }}>
                        <button className="text-red-500 hover:text-red-700">✕</button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
              <form action={async (fd: FormData) => { 'use server'; await createBeneficiary(p.id, id, fd); }}
                className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="label !text-xs">ชื่อ *</label>
                  <input className="input !py-1 text-xs w-36" name="name" required />
                </div>
                <div>
                  <label className="label !text-xs">ความสัมพันธ์</label>
                  <input className="input !py-1 text-xs w-28" name="relation" placeholder="บุตร/คู่สมรส..." />
                </div>
                <div>
                  <label className="label !text-xs">% รับ</label>
                  <input className="input !py-1 text-xs w-16" name="share_pct" type="number" defaultValue="100" min="1" max="100" />
                </div>
                <div>
                  <label className="label !text-xs">เบอร์โทร</label>
                  <input className="input !py-1 text-xs w-28" name="phone" />
                </div>
                <button className="btn-ghost !py-1 text-xs">+ เพิ่ม</button>
              </form>
            </div>
          </div>
        );
      })}

      <PolicyForm action={async (fd: FormData) => { 'use server'; await createPolicy(id, fd); }} />

      {/* Contact log */}
      <h2 className="text-xl font-bold mt-8 mb-2">ประวัติการติดต่อ ({contacts.length})</h2>
      <div className="card p-0 overflow-hidden mb-4">
        <table className="table">
          <thead><tr><th>วันที่</th><th>ช่องทาง</th><th>ผล</th><th>หมายเหตุ</th><th>โดย</th><th></th></tr></thead>
          <tbody>
            {contacts.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-500 py-6">ยังไม่มีบันทึกการติดต่อ</td></tr>
            )}
            {contacts.map((ct) => (
              <tr key={ct.id} className="hover:bg-slate-50">
                <td>{ct.contact_date}</td>
                <td>{channelLabel[ct.channel] || ct.channel}</td>
                <td>{outcomeLabel[ct.outcome] || ct.outcome}</td>
                <td>{ct.note || '-'}</td>
                <td>{ct.creator_name || '-'}</td>
                <td>
                  <form action={async () => { 'use server'; await deleteContact(ct.id, id); }}>
                    <button className="text-red-600 text-xs hover:underline">ลบ</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ContactForm
        action={async (fd: FormData) => { 'use server'; await createContact(id, fd); }}
        defaultNext={c.next_contact_date}
      />
    </Shell>
  );
}
