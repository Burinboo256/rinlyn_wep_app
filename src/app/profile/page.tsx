import { requireUser } from '@/lib/auth';
import Shell from '@/components/Shell';
import { getDb } from '@/lib/db';
import { changePassword, updateLicense } from '@/lib/actions';

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
  const userRow = getDb().prepare('SELECT license_no, license_expiry FROM users WHERE id=?').get(u.id) as any;

  const today = new Date().toISOString().slice(0, 10);
  const licenseExpiring = userRow?.license_expiry &&
    userRow.license_expiry <= new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
  const licenseExpired = userRow?.license_expiry && userRow.license_expiry < today;

  return (
    <Shell user={u} nav={nav}>
      <h1 className="text-2xl font-bold mb-4">โปรไฟล์</h1>

      {searchParams.ok && (
        <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 mb-4">✅ บันทึกสำเร็จ</div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Info */}
        <div className="card">
          <h2 className="font-semibold mb-3">ข้อมูลบัญชี</h2>
          <dl className="text-sm space-y-2">
            <div><dt className="text-slate-500">ชื่อ</dt><dd className="font-medium">{u.full_name}</dd></div>
            <div><dt className="text-slate-500">Username</dt><dd>{u.username}</dd></div>
            <div><dt className="text-slate-500">บทบาท</dt>
              <dd><span className="badge bg-indigo-100 text-indigo-700">{u.role === 'supervisor' ? 'หัวหน้าทีม' : 'ตัวแทน'}</span></dd>
            </div>
          </dl>
        </div>

        {/* License */}
        <div className="card">
          <h2 className="font-semibold mb-3">ใบอนุญาตตัวแทน</h2>
          {licenseExpired && <div className="bg-red-50 text-red-700 text-sm rounded p-2 mb-2">⚠️ ใบอนุญาตหมดอายุแล้ว</div>}
          {licenseExpiring && !licenseExpired && <div className="bg-amber-50 text-amber-700 text-sm rounded p-2 mb-2">⚠️ ใบอนุญาตใกล้หมดอายุ</div>}
          <form action={updateLicense} className="space-y-3">
            <div>
              <label className="label">เลขที่ใบอนุญาต</label>
              <input className="input" name="license_no" defaultValue={userRow?.license_no || ''} placeholder="ตัวอย่าง: ก.59-00001" />
            </div>
            <div>
              <label className="label">วันหมดอายุ</label>
              <input className="input" name="license_expiry" type="date" defaultValue={userRow?.license_expiry || ''} />
            </div>
            <button className="btn-primary" type="submit">บันทึก</button>
          </form>
        </div>

        {/* Change password */}
        <div className="card">
          <h2 className="font-semibold mb-3">เปลี่ยนรหัสผ่าน</h2>
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
              <label className="label">รหัสผ่านใหม่ (≥ 6 ตัว)</label>
              <input className="input" name="new_password" type="password" required minLength={6} />
            </div>
            <div>
              <label className="label">ยืนยันรหัสผ่านใหม่</label>
              <input className="input" name="confirm_password" type="password" required />
            </div>
            <button className="btn-primary w-full" type="submit">เปลี่ยนรหัสผ่าน</button>
          </form>
        </div>

        {/* Export */}
        <div className="card">
          <h2 className="font-semibold mb-3">Export ข้อมูล</h2>
          <p className="text-sm text-slate-500 mb-3">ดาวน์โหลดเป็น CSV เปิดด้วย Excel ได้เลย</p>
          <div className="flex flex-col gap-2">
            <a href="/api/export/customers" className="btn-ghost text-center">
              📥 Export ลูกค้า (.csv)
            </a>
            <a href="/api/export/policies" className="btn-ghost text-center">
              📥 Export กรมธรรม์ (.csv)
            </a>
          </div>
        </div>
      </div>
    </Shell>
  );
}
