import { requireSupervisor } from '@/lib/auth';
import Shell from '@/components/Shell';
import { teamSummary, commissionSummary, agentCommissionBreakdown } from '@/lib/queries';

const supNav = [
  { href: '/supervisor', label: 'แดชบอร์ด' },
  { href: '/supervisor/customers', label: 'ลูกค้าทีม' },
  { href: '/supervisor/team', label: 'จัดการตัวแทน' },
  { href: '/supervisor/expiring', label: 'ใกล้หมดอายุ' },
  { href: '/supervisor/products', label: 'ผลิตภัณฑ์' },
  { href: '/supervisor/commission', label: 'ค่าคอม' },
];

export default async function CommissionPage({ searchParams }: { searchParams: { year?: string } }) {
  const u = await requireSupervisor();
  const year = Number(searchParams.year || new Date().getFullYear());
  const sum = teamSummary(u.id);
  const teamCom = commissionSummary(sum.agentIds, year);
  const breakdown = agentCommissionBreakdown(u.id, year);
  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Shell user={u} nav={supNav}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold">ค่าคอมมิชชั่น</h1>
        <div className="flex gap-2">
          {years.map(y => (
            <a key={y} href={`/supervisor/commission?year=${y}`}
              className={y === year ? 'btn-primary !py-1' : 'btn-ghost !py-1'}>
              {y}
            </a>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-slate-500 text-sm">FYC รวมทีม</div>
          <div className="text-3xl font-bold text-indigo-700">{Number(teamCom.fyc).toLocaleString()}</div>
          <div className="text-xs text-slate-400">ค่าคอมปีแรก (฿)</div>
        </div>
        <div className="card">
          <div className="text-slate-500 text-sm">RYC รวมทีม</div>
          <div className="text-3xl font-bold text-indigo-700">{Number(teamCom.ryc).toLocaleString()}</div>
          <div className="text-xs text-slate-400">ค่าคอมปีต่อ (฿)</div>
        </div>
        <div className="card">
          <div className="text-slate-500 text-sm">รวมทั้งหมด</div>
          <div className="text-3xl font-bold text-green-700">{Number(teamCom.total).toLocaleString()}</div>
          <div className="text-xs text-slate-400">฿ ปี {year}</div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-2">แยกตามตัวแทน</h2>
      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead><tr><th>ตัวแทน</th><th>FYC (฿)</th><th>RYC (฿)</th><th>รวม (฿)</th></tr></thead>
          <tbody>
            {breakdown.length === 0 && <tr><td colSpan={4} className="text-center text-slate-500 py-6">ไม่มีข้อมูลปี {year}</td></tr>}
            {breakdown.map((a) => (
              <tr key={a.id}>
                <td>{a.full_name} <span className="text-slate-400 text-xs">@{a.username}</span></td>
                <td>{Number(a.fyc).toLocaleString()}</td>
                <td>{Number(a.ryc).toLocaleString()}</td>
                <td className="font-semibold">{Number(a.total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
