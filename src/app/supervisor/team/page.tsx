import { requireSupervisor } from '@/lib/auth';
import Shell from '@/components/Shell';
import { listAgents } from '@/lib/queries';
import { createAgent, removeAgent, resetAgentPassword } from '@/lib/actions';

const supNav = [
  { href: '/supervisor', label: 'แดชบอร์ด' },
  { href: '/supervisor/customers', label: 'ลูกค้าทีม' },
  { href: '/supervisor/team', label: 'จัดการตัวแทน' },
  { href: '/supervisor/expiring', label: 'ใกล้หมดอายุ' },
  { href: '/supervisor/products', label: 'ผลิตภัณฑ์' },
  { href: '/supervisor/commission', label: 'ค่าคอม' },
];

export default async function TeamPage({ searchParams }: { searchParams: { e?: string } }) {
  const u = await requireSupervisor();
  const agents = listAgents(u.id);
  return (
    <Shell user={u} nav={supNav}>
      <h1 className="text-2xl font-bold mb-4">จัดการตัวแทน</h1>

      <div className="card mb-6">
        <h3 className="font-semibold mb-3">+ เพิ่มตัวแทนใหม่</h3>
        {searchParams.e === 'dup' && <div className="bg-red-50 text-red-700 text-sm rounded p-2 mb-2">ชื่อผู้ใช้ซ้ำ</div>}
        {searchParams.e === 'missing' && <div className="bg-red-50 text-red-700 text-sm rounded p-2 mb-2">กรอกข้อมูลไม่ครบ</div>}
        <form action={createAgent} className="grid md:grid-cols-4 gap-3 items-end">
          <div><label className="label">ชื่อ-นามสกุล</label><input className="input" name="full_name" required /></div>
          <div><label className="label">ชื่อผู้ใช้</label><input className="input" name="username" required /></div>
          <div><label className="label">รหัสผ่าน</label><input className="input" name="password" type="text" required /></div>
          <button className="btn-primary" type="submit">เพิ่ม</button>
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead><tr><th>ชื่อ</th><th>Username</th><th>ลูกค้า</th><th>กรมธรรม์</th><th>เบี้ยรวม</th><th>การจัดการ</th></tr></thead>
          <tbody>
            {agents.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-6">ยังไม่มีตัวแทน</td></tr>}
            {agents.map((a) => (
              <tr key={a.id}>
                <td>{a.full_name}</td>
                <td>@{a.username}</td>
                <td>{a.customer_count}</td>
                <td>{a.policy_count}</td>
                <td>{Number(a.total_premium).toLocaleString()}</td>
                <td>
                  <div className="flex gap-2">
                    <form action={async (fd: FormData) => { 'use server'; await resetAgentPassword(a.id, fd); }} className="flex gap-1">
                      <input className="input !py-1 !px-2 text-xs w-28" name="password" placeholder="รหัสใหม่" required />
                      <button className="btn-ghost !py-1 !px-2 text-xs">รีเซ็ต</button>
                    </form>
                    <form action={async () => { 'use server'; await removeAgent(a.id); }}>
                      <button className="btn-danger !py-1 !px-2 text-xs">ลบ</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
