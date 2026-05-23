import Link from 'next/link';
import { requireSupervisor } from '@/lib/auth';
import Shell from '@/components/Shell';
import { teamSummary, expiringPolicies } from '@/lib/queries';

const supNav = [
  { href: '/supervisor', label: 'แดชบอร์ด' },
  { href: '/supervisor/customers', label: 'ลูกค้าทีม' },
  { href: '/supervisor/team', label: 'จัดการตัวแทน' },
  { href: '/supervisor/expiring', label: 'ใกล้หมดอายุ' },
];

export default async function Expiring({ searchParams }: { searchParams: { days?: string } }) {
  const u = await requireSupervisor();
  const days = Number(searchParams.days || 30);
  const sum = teamSummary(u.id);
  const list = expiringPolicies(sum.agentIds, days);
  return (
    <Shell user={u} nav={supNav}>
      <h1 className="text-2xl font-bold mb-4">กรมธรรม์ใกล้หมดอายุ</h1>
      <div className="flex gap-2 mb-4">
        {[30, 60, 90, 180].map((d) => (
          <Link key={d} href={`/supervisor/expiring?days=${d}`} className={d === days ? 'btn-primary' : 'btn-ghost'}>
            {d} วัน
          </Link>
        ))}
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead><tr><th>ลูกค้า</th><th>กรมธรรม์</th><th>วันหมดอายุ</th><th>เบี้ย</th><th>ตัวแทน</th><th>เบอร์โทร</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-6">ไม่มีกรมธรรม์ใกล้หมดอายุใน {days} วัน</td></tr>}
            {list.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/customers/${p.customer_id}`} className="text-indigo-700">{p.customer_name}</Link></td>
                <td>{p.product_name} {p.policy_no && <span className="text-slate-400 text-xs">({p.policy_no})</span>}</td>
                <td><span className="badge bg-amber-100 text-amber-700">{p.end_date}</span></td>
                <td>{Number(p.premium).toLocaleString()}</td>
                <td>{p.agent_name}</td>
                <td>{p.phone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
