import { requireSupervisor } from '@/lib/auth';
import Shell from '@/components/Shell';
import { getDb } from '@/lib/db';
import { createProduct, toggleProduct } from '@/lib/actions';

const supNav = [
  { href: '/supervisor', label: 'แดชบอร์ด' },
  { href: '/supervisor/customers', label: 'ลูกค้าทีม' },
  { href: '/supervisor/team', label: 'จัดการตัวแทน' },
  { href: '/supervisor/expiring', label: 'ใกล้หมดอายุ' },
  { href: '/supervisor/products', label: 'ผลิตภัณฑ์' },
  { href: '/supervisor/commission', label: 'ค่าคอม' },
];

const catLabel: Record<string, string> = {
  life: '🛡️ ประกันชีวิต', annuity: '💰 บำนาญ', health: '🏥 สุขภาพ/โรคร้ายแรง', pa: '⚡ อุบัติเหตุ',
};

export default async function ProductsPage({ searchParams }: { searchParams: { e?: string } }) {
  const u = await requireSupervisor();
  const products = getDb().prepare('SELECT * FROM products ORDER BY category, name').all() as any[];

  return (
    <Shell user={u} nav={supNav}>
      <h1 className="text-2xl font-bold mb-4">จัดการผลิตภัณฑ์</h1>

      <div className="card mb-6">
        <h3 className="font-semibold mb-3">+ เพิ่มผลิตภัณฑ์ใหม่</h3>
        {searchParams.e === 'dup' && <p className="text-red-600 text-sm mb-2">รหัสผลิตภัณฑ์นี้มีอยู่แล้ว</p>}
        {searchParams.e === 'missing' && <p className="text-red-600 text-sm mb-2">กรอกข้อมูลไม่ครบ</p>}
        <form action={createProduct} className="grid md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="label">รหัส</label>
            <input className="input" name="code" placeholder="WL002" required />
          </div>
          <div className="md:col-span-2">
            <label className="label">ชื่อผลิตภัณฑ์</label>
            <input className="input" name="name" required />
          </div>
          <div>
            <label className="label">ประเภท</label>
            <select className="input" name="category">
              <option value="life">ประกันชีวิต</option>
              <option value="annuity">บำนาญ</option>
              <option value="health">สุขภาพ</option>
              <option value="pa">PA</option>
            </select>
          </div>
          <div>
            <label className="label">ค่าคอม % default</label>
            <input className="input" name="default_commission_rate" type="number" defaultValue="20" />
          </div>
          <button className="btn-primary" type="submit">เพิ่ม</button>
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="table">
          <thead><tr><th>รหัส</th><th>ชื่อ</th><th>ประเภท</th><th>คอม %</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.is_active ? '' : 'opacity-50'}>
                <td className="font-mono text-sm">{p.code}</td>
                <td>{p.name}</td>
                <td>{catLabel[p.category] || p.category}</td>
                <td>{p.default_commission_rate}%</td>
                <td><span className={`badge ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.is_active ? 'ใช้งาน' : 'ปิด'}</span></td>
                <td>
                  <form action={async () => { 'use server'; await toggleProduct(p.id); }}>
                    <button className="btn-ghost !py-1 text-xs">{p.is_active ? 'ปิด' : 'เปิด'}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
