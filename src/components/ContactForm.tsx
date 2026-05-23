export default function ContactForm({
  action,
  defaultNext,
}: {
  action: (fd: FormData) => void;
  defaultNext?: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="card space-y-3">
      <h3 className="font-semibold">บันทึกการติดต่อ</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="label">วันที่ติดต่อ</label>
          <input className="input" name="contact_date" type="date" defaultValue={today} required />
        </div>
        <div>
          <label className="label">ช่องทาง</label>
          <select className="input" name="channel" defaultValue="phone">
            <option value="phone">โทร</option>
            <option value="line">LINE</option>
            <option value="email">อีเมล</option>
            <option value="meeting">เจอตัว</option>
            <option value="other">อื่นๆ</option>
          </select>
        </div>
        <div>
          <label className="label">ผลการติดต่อ</label>
          <select className="input" name="outcome" defaultValue="contacted">
            <option value="contacted">ติดต่อได้</option>
            <option value="no_answer">ไม่รับสาย</option>
            <option value="reschedule">นัดใหม่</option>
            <option value="renewed">ต่ออายุแล้ว</option>
            <option value="not_interested">ไม่สนใจ</option>
            <option value="follow_up">รอติดตาม</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">หมายเหตุ</label>
          <input className="input" name="note" />
        </div>
        <div>
          <label className="label">นัดติดต่อครั้งถัดไป</label>
          <input className="input" name="next_contact_date" type="date" defaultValue={defaultNext || ''} />
        </div>
      </div>
      <button className="btn-primary" type="submit">บันทึก</button>
    </form>
  );
}
