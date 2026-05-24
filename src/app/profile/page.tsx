import { requireUser } from '@/lib/auth';
import Shell from '@/components/Shell';
import { changePassword } from '@/lib/actions';

const errMsg: Record<string, string> = {
  missing: 'กรุณากรอกให้ครบทุกช่อง',
  mismatch: 'รหัสผ่านใหม่ไม่ตรงกัน',
  short: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
  wrong: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
};

export default async function Profile({ searchParams }: { searchParams: { e?: string; ok?: string } }) {
  const u = await requireUser();
  const nav = u.role === 'supervisor'
    ? [{ href: '/supervisor', label: '← กลับ' }]
    : [{ href: '/agent', label: '← กลับ' }];

  return (
    <Shell user={u} nav={nav}>
      <h1 className="text-2xl font-bold mb-4">โปรไฟล์</h1>

      <div className="card mb-4 max-w-sm">
        <dl className="text-sm space-y-1">
          <div><dt className="inline text-slate-500">ชื่อ: </dt><dd className="inline font-medium">{u.full_name}</dd></div>
          <div><dt className="inline text-slate-500">Username: </dt><dd className="inline">{u.username}</dd></div>
          <div><dt className="inline text-slate-500">บทบาท: </dt>
            <dd className="inline">
              <span className="badge bg-slate-100 text-slate-700">
                {u.role === 'supervisor' ? 'หัวหน้าทีม' : 'ตัวแทน'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="card max-w-sm">
        <h2 className="font-semibold mb-3">เปลี่ยนรหัสผ่าน</h2>
        {searchParams.ok && (
          <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-3">
            ✅ เปลี่ยนรหัสผ่านสำเร็จ
          </div>
        )}
        {searchParams.e && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-3">
            {errMsg[searchParams.e] || 'เกิดข้อผิดพลาด'}
          </div>
        )}
        <form action={changePassword} className="space-y-3">
          <div>
            <label className="label">รหัสผ่านปัจจุบัน</label>
            <input className="input" name="current_password" type="password" required />
          </div>
          <div>
            <label className="label">รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label>
            <input className="input" name="new_password" type="password" required minLength={6} />
          </div>
          <div>
            <label className="label">ยืนยันรหัสผ่านใหม่</label>
            <input className="input" name="confirm_password" type="password" required />
          </div>
          <button className="btn-primary w-full" type="submit">เปลี่ยนรหัสผ่าน</button>
        </form>
      </div>
    </Shell>
  );
}
