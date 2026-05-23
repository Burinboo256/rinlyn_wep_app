import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import Shell from '@/components/Shell';
import { getCustomer, listPoliciesByCustomer, listContactsByCustomer } from '@/lib/queries';
import { getDb } from '@/lib/db';
import PolicyForm from '@/components/PolicyForm';
import ContactForm from '@/components/ContactForm';
import { createPolicy, deletePolicy, deleteCustomer, createContact, deleteContact } from '@/lib/actions';

const channelLabel: Record<string, string> = {
  phone: 'โทร', line: 'LINE', email: 'อีเมล', meeting: 'เจอตัว', other: 'อื่นๆ',
};
const outcomeLabel: Record<string, string> = {
  contacted: 'ติดต่อได้', no_answer: 'ไม่รับสาย', reschedule: 'นัดใหม่',
  renewed: 'ต่ออายุแล้ว', not_interested: 'ไม่สนใจ', follow_up: 'รอติดตาม',
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

  return (
    <Shell user={u} nav={[{ href: back, label: '← กลับ' }]}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{c.full_name}</h1>
          <p className="text-slate-500 text-sm">{c.phone || '-'} · {c.email || '-'}</p>
          {nextDue && (
            <p className="text-sm mt-1">
              นัดติดต่อ:{' '}
              <span className={`badge ${overdue ? 'bg-red-100 text-red-700' : dueSoon ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                {nextDue} {overdue && '(เลย)'}
              </span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/customers/${id}/edit`} className="btn-ghost">แก้ไข</Link>
          {u.role === 'agent' && (
            <form action={async () => { 'use server'; await deleteCustomer(id); }}>
              <button className="btn-danger" type="submit">ลบลูกค้า</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold mb-2">ข้อมูลส่วนตัว</h3>
          <dl className="text-sm space-y-1">
            <div><dt className="inline text-slate-500">เลขบัตร: </dt><dd className="inline">{c.national_id || '-'}</dd></div>
            <div><dt className="inline text-slate-500">วันเกิด: </dt><dd className="inline">{c.dob || '-'}</dd></div>
            <div><dt className="inline text-slate-500">ที่อยู่: </dt><dd className="inline">{c.address || '-'}</dd></div>
            <div><dt className="inline text-slate-500">ผู้รับผลประโยชน์: </dt><dd className="inline">{c.beneficiary || '-'}</dd></div>
            <div><dt className="inline text-slate-500">หมายเหตุ: </dt><dd className="inline">{c.note || '-'}</dd></div>
          </dl>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">สรุปกรมธรรม์</h3>
          <p className="text-sm">จำนวน: <b>{policies.length}</b></p>
          <p className="text-sm">เบี้ยรวม: <b>{policies.reduce((s, p) => s + p.premium, 0).toLocaleString()}</b> ฿</p>
          <p className="text-sm">ทุนรวม: <b>{policies.reduce((s, p) => s + p.sum_insured, 0).toLocaleString()}</b> ฿</p>
          <p className="text-sm mt-2">การติดต่อล่าสุด: <b>{contacts[0]?.contact_date || '-'}</b></p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-2">กรมธรรม์</h2>
      <div className="card p-0 overflow-hidden mb-6">
        <table className="table">
          <thead>
            <tr>
              <th>เลขที่</th><th>ผลิตภัณฑ์</th><th>การชำระ</th><th>เบี้ย</th><th>ทุน</th>
              <th>เริ่ม</th><th>หมดอายุ</th><th>สถานะ</th><th></th>
            </tr>
          </thead>
          <tbody>
            {policies.length === 0 && (
              <tr><td colSpan={9} className="text-center text-slate-500 py-6">ยังไม่มีกรมธรรม์</td></tr>
            )}
            {policies.map((p) => {
              const expiring = p.end_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) && p.end_date >= today;
              const expired = p.end_date < today;
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td>{p.policy_no || '-'}</td>
                  <td>{p.product_name}</td>
                  <td>{p.payment_type}</td>
                  <td>{p.premium.toLocaleString()}</td>
                  <td>{p.sum_insured.toLocaleString()}</td>
                  <td>{p.start_date}</td>
                  <td>
                    {p.end_date}{' '}
                    {expired && <span className="badge bg-red-100 text-red-700">หมดอายุ</span>}
                    {expiring && <span className="badge bg-amber-100 text-amber-700">ใกล้หมด</span>}
                  </td>
                  <td>{p.status}</td>
                  <td>
                    <form action={async () => { 'use server'; await deletePolicy(p.id, id); }}>
                      <button className="text-red-600 text-xs hover:underline">ลบ</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PolicyForm action={async (fd: FormData) => { 'use server'; await createPolicy(id, fd); }} />

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
