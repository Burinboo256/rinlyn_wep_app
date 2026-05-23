import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import Shell from '@/components/Shell';
import { listCustomersByAgent, dueContacts, expiringPolicies } from '@/lib/queries';
import { redirect } from 'next/navigation';

export default async function AgentHome({ searchParams }: { searchParams: { q?: string } }) {
  const u = await requireUser();
  if (u.role !== 'agent') redirect('/supervisor');

  const q = searchParams.q || '';
  const customers = listCustomersByAgent(u.id, { q });
  const dueToday = dueContacts([u.id], 0);
  const dueWeek = dueContacts([u.id], 7);
  const expiring30 = expiringPolicies([u.id], 30);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Shell
      user={u}
      nav={[
        { href: '/agent', label: 'ลูกค้า' },
        { href: '/agent/new', label: '+ เพิ่มลูกค้า' },
      ]}
    >
      <h1 className="text-2xl font-bold mb-4">สวัสดี, {u.full_name}</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <WidgetCard title="ต้องติดต่อวันนี้" count={dueToday.length} tone="red" items={dueToday} emptyText="ไม่มีนัดวันนี้" />
        <WidgetCard title="ต้องติดต่อภายใน 7 วัน" count={dueWeek.length} tone="amber" items={dueWeek} emptyText="ไม่มีนัดในสัปดาห์นี้" />
        <div className="card">
          <div className="text-slate-500 text-sm">กรมธรรม์ใกล้หมดอายุ (30 วัน)</div>
          <div className="text-3xl font-bold text-amber-700">{expiring30.length}</div>
          <ul className="text-sm divide-y mt-2">
            {expiring30.length === 0 && <li className="py-1 text-slate-400">ไม่มี</li>}
            {expiring30.slice(0, 3).map((p) => (
              <li key={p.id} className="py-1 flex justify-between">
                <Link href={`/customers/${p.customer_id}`} className="text-indigo-700 truncate">{p.customer_name}</Link>
                <span className="text-slate-500 text-xs">{p.end_date}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-xl font-bold">ลูกค้าของฉัน ({customers.length})</h2>
        <div className="flex gap-2 items-center">
          <form className="flex gap-2">
            <input className="input !py-1 w-56" name="q" placeholder="ค้นหา ชื่อ/เบอร์/เลขบัตร" defaultValue={q} />
            <button className="btn-ghost !py-1" type="submit">ค้นหา</button>
            {q && <Link href="/agent" className="btn-ghost !py-1">ล้าง</Link>}
          </form>
          <Link href="/agent/new" className="btn-primary">+ เพิ่ม</Link>
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>ชื่อ</th><th>เบอร์โทร</th><th>กรมธรรม์</th><th>เบี้ยรวม</th><th>นัดถัดไป</th><th></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-500 py-8">
                {q ? `ไม่พบลูกค้าที่ตรงกับ "${q}"` : 'ยังไม่มีลูกค้า — กด "+ เพิ่ม"'}
              </td></tr>
            )}
            {customers.map((c) => {
              const overdue = c.next_contact_date && c.next_contact_date < today;
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td><Link href={`/customers/${c.id}`} className="text-indigo-700 font-medium">{c.full_name}</Link></td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.policy_count}</td>
                  <td>{c.total_premium.toLocaleString()} ฿</td>
                  <td>
                    {c.next_contact_date ? (
                      <span className={`badge ${overdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {c.next_contact_date}
                      </span>
                    ) : '-'}
                  </td>
                  <td><Link href={`/customers/${c.id}`} className="btn-ghost !py-1 text-xs">ดู</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

function WidgetCard({ title, count, tone, items, emptyText }: {
  title: string; count: number; tone: 'red' | 'amber';
  items: any[]; emptyText: string;
}) {
  const color = tone === 'red' ? 'text-red-700' : 'text-amber-700';
  return (
    <div className="card">
      <div className="text-slate-500 text-sm">{title}</div>
      <div className={`text-3xl font-bold ${color}`}>{count}</div>
      <ul className="text-sm divide-y mt-2">
        {items.length === 0 && <li className="py-1 text-slate-400">{emptyText}</li>}
        {items.slice(0, 3).map((c) => (
          <li key={c.id} className="py-1 flex justify-between">
            <Link href={`/customers/${c.id}`} className="text-indigo-700 truncate">{c.full_name}</Link>
            <span className="text-slate-500 text-xs">{c.next_contact_date}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
