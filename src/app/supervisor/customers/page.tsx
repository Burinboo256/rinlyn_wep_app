import Link from 'next/link';
import { requireSupervisor } from '@/lib/auth';
import Shell from '@/components/Shell';
import { listCustomersBySupervisor } from '@/lib/queries';

const supNav = [
  { href: '/supervisor', label: 'แดชบอร์ด' },
  { href: '/supervisor/customers', label: 'ลูกค้าทีม' },
  { href: '/supervisor/team', label: 'จัดการตัวแทน' },
  { href: '/supervisor/expiring', label: 'ใกล้หมดอายุ' },
  { href: '/supervisor/products', label: 'ผลิตภัณฑ์' },
  { href: '/supervisor/commission', label: 'ค่าคอม' },
];

export default async function TeamCustomers({ searchParams }: { searchParams: { q?: string } }) {
  const u = await requireSupervisor();
  const q = searchParams.q || '';
  const customers = listCustomersBySupervisor(u.id, { q });
  return (
    <Shell user={u} nav={supNav}>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">ลูกค้าของทีม ({customers.length})</h1>
        <form className="flex gap-2">
          <input className="input !py-1 w-64" name="q" placeholder="ค้นหา ชื่อ/เบอร์/เลขบัตร" defaultValue={q} />
          <button className="btn-ghost !py-1" type="submit">ค้นหา</button>
          {q && <Link href="/supervisor/customers" className="btn-ghost !py-1">ล้าง</Link>}
        </form>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead><tr><th>ลูกค้า</th><th>เบอร์โทร</th><th>ตัวแทน</th><th>กรมธรรม์</th><th>เบี้ยรวม</th><th>นัดถัดไป</th></tr></thead>
          <tbody>
            {customers.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-6">{q ? `ไม่พบลูกค้าที่ตรงกับ "${q}"` : 'ยังไม่มีลูกค้า'}</td></tr>}
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td><Link href={`/customers/${c.id}`} className="text-indigo-700">{c.full_name}</Link></td>
                <td>{c.phone || '-'}</td>
                <td>{c.agent_name}</td>
                <td>{c.policy_count}</td>
                <td>{Number(c.total_premium).toLocaleString()} ฿</td>
                <td>{c.next_contact_date || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
