import Link from 'next/link';
import { requireSupervisor } from '@/lib/auth';
import Shell from '@/components/Shell';
import {
  teamSummary, expiringPolicies, listAgents,
  fypMonthToDate, idleAgents, newPoliciesToday, dueContacts,
} from '@/lib/queries';

const supNav = [
  { href: '/supervisor', label: 'แดชบอร์ด' },
  { href: '/supervisor/customers', label: 'ลูกค้าทีม' },
  { href: '/supervisor/team', label: 'จัดการตัวแทน' },
  { href: '/supervisor/expiring', label: 'ใกล้หมดอายุ' },
];

export default async function SupervisorHome() {
  const u = await requireSupervisor();
  const sum = teamSummary(u.id);
  const expiring30 = expiringPolicies(sum.agentIds, 30);
  const agents = listAgents(u.id);
  const fyp = fypMonthToDate(sum.agentIds);
  const idle = idleAgents(u.id, 30);
  const todayNew = newPoliciesToday(sum.agentIds);
  const dueWeek = dueContacts(sum.agentIds, 7);

  return (
    <Shell user={u} nav={supNav}>
      <h1 className="text-2xl font-bold mb-4">แดชบอร์ดหัวหน้าทีม</h1>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">วันนี้ / สัปดาห์นี้</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <KpiCard label="ต้องติดต่อใน 7 วัน" value={dueWeek.length} tone="amber" hint="ทั้งทีม" />
          <KpiCard label="ใกล้หมดอายุ 30 วัน" value={expiring30.length} tone="amber" link="/supervisor/expiring" />
          <KpiCard label="กรมธรรม์ใหม่วันนี้" value={todayNew} tone="green" />
          <KpiCard label="ตัวแทนนิ่ง (30+ วัน)" value={idle.length} tone={idle.length > 0 ? 'red' : 'slate'} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">เดือนนี้</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <KpiCard label="FYP MTD (฿)" value={Number(fyp.premium).toLocaleString()} tone="indigo" hint={`${fyp.count} กรมธรรม์`} />
          <KpiCard label="ลูกค้าทั้งหมด" value={sum.customers} tone="slate" />
          <KpiCard label="กรมธรรม์ทั้งหมด" value={sum.policies} tone="slate" />
          <KpiCard label="เบี้ยรวมทั้งหมด (฿)" value={Number(sum.premium).toLocaleString()} tone="slate" />
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold mb-2">⚠️ ตัวแทนที่ต้องดูแล (ไม่มีกรมธรรม์ใหม่ ≥ 30 วัน)</h3>
          {idle.length === 0 ? (
            <p className="text-sm text-slate-500">ทั้งทีมแอคทีฟ 🎉</p>
          ) : (
            <ul className="text-sm divide-y">
              {idle.map((a) => (
                <li key={a.id} className="py-2 flex justify-between">
                  <span>{a.full_name} <span className="text-slate-400 text-xs">@{a.username}</span></span>
                  <span className="badge bg-red-100 text-red-700">{a.days_idle} วัน</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">📋 ใกล้หมดอายุใน 7 วัน</h3>
          {expiringPolicies(sum.agentIds, 7).length === 0 ? (
            <p className="text-sm text-slate-500">ไม่มี</p>
          ) : (
            <ul className="text-sm divide-y">
              {expiringPolicies(sum.agentIds, 7).slice(0, 5).map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <Link href={`/customers/${p.customer_id}`} className="text-indigo-700">{p.customer_name}</Link>
                  <span className="text-slate-500 text-xs">{p.end_date} · {p.agent_name}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/supervisor/expiring" className="text-indigo-700 text-sm">ดูทั้งหมด →</Link>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-2">ผลงานตัวแทน</h2>
      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead><tr><th>ชื่อ</th><th>ลูกค้า</th><th>กรมธรรม์</th><th>เบี้ยรวม</th><th>กรมธรรม์ล่าสุด</th></tr></thead>
          <tbody>
            {agents.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 py-6">ยังไม่มีตัวแทน — <Link href="/supervisor/team" className="text-indigo-700">เพิ่มตัวแทน</Link></td></tr>}
            {agents.map((a) => (
              <tr key={a.id}>
                <td>{a.full_name} <span className="text-slate-400 text-xs">@{a.username}</span></td>
                <td>{a.customer_count}</td>
                <td>{a.policy_count}</td>
                <td>{Number(a.total_premium).toLocaleString()} ฿</td>
                <td>{a.last_policy_at ? a.last_policy_at.slice(0, 10) : <span className="text-slate-400">ยังไม่มี</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

function KpiCard({ label, value, tone, hint, link }: {
  label: string; value: number | string;
  tone: 'red' | 'amber' | 'green' | 'indigo' | 'slate';
  hint?: string; link?: string;
}) {
  const color = {
    red: 'text-red-700', amber: 'text-amber-700', green: 'text-green-700',
    indigo: 'text-indigo-700', slate: 'text-slate-700',
  }[tone];
  const body = (
    <div className="card">
      <div className="text-slate-500 text-sm">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
  return link ? <Link href={link}>{body}</Link> : body;
}
