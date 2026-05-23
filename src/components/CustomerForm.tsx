import type { Customer } from '@/lib/queries';

export default function CustomerForm({
  action,
  initial,
  submitLabel,
  errorCode,
}: {
  action: (fd: FormData) => void;
  initial?: Partial<Customer>;
  submitLabel: string;
  errorCode?: string;
}) {
  const i = initial || {};
  const errMsg =
    errorCode === 'invalidId' ? 'เลขบัตรประชาชนไม่ถูกต้อง (checksum ไม่ผ่าน)' :
    errorCode === 'dupId' ? 'มีลูกค้าคนอื่นใช้เลขบัตรประชาชนนี้แล้วในระบบ' :
    null;
  return (
    <form action={action} className="card space-y-4">
      {errMsg && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{errMsg}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">ชื่อ-นามสกุล *</label>
          <input className="input" name="full_name" required defaultValue={i.full_name || ''} />
        </div>
        <div>
          <label className="label">เลขบัตรประชาชน <span className="text-slate-400 text-xs">(13 หลัก, ใส่ขีดได้)</span></label>
          <input className="input" name="national_id" defaultValue={i.national_id || ''} pattern="[\d\s-]*" inputMode="numeric" />
        </div>
        <div>
          <label className="label">วันเกิด</label>
          <input className="input" name="dob" type="date" defaultValue={i.dob || ''} />
        </div>
        <div>
          <label className="label">เบอร์โทร</label>
          <input className="input" name="phone" defaultValue={i.phone || ''} />
        </div>
        <div>
          <label className="label">อีเมล</label>
          <input className="input" name="email" type="email" defaultValue={i.email || ''} />
        </div>
        <div>
          <label className="label">ผู้รับผลประโยชน์</label>
          <input className="input" name="beneficiary" defaultValue={i.beneficiary || ''} />
        </div>
        <div>
          <label className="label">วันที่ต้องติดต่อครั้งถัดไป</label>
          <input className="input" name="next_contact_date" type="date" defaultValue={i.next_contact_date || ''} />
        </div>
        <div className="md:col-span-2">
          <label className="label">ที่อยู่</label>
          <textarea className="input" name="address" rows={2} defaultValue={i.address || ''} />
        </div>
        <div className="md:col-span-2">
          <label className="label">หมายเหตุ</label>
          <textarea className="input" name="note" rows={2} defaultValue={i.note || ''} />
        </div>
      </div>
      <button className="btn-primary" type="submit">{submitLabel}</button>
    </form>
  );
}
