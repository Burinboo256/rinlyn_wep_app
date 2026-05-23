export default function PolicyForm({ action }: { action: (fd: FormData) => void }) {
  return (
    <form action={action} className="card space-y-4">
      <h3 className="font-semibold">เพิ่มกรมธรรม์</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">เลขที่กรมธรรม์</label>
          <input className="input" name="policy_no" />
        </div>
        <div>
          <label className="label">ชื่อผลิตภัณฑ์ *</label>
          <input className="input" name="product_name" required />
        </div>
        <div>
          <label className="label">ประเภทการชำระเงิน *</label>
          <select className="input" name="payment_type" required defaultValue="รายปี">
            <option>รายเดือน</option>
            <option>ราย 3 เดือน</option>
            <option>ราย 6 เดือน</option>
            <option>รายปี</option>
            <option>ชำระครั้งเดียว</option>
          </select>
        </div>
        <div>
          <label className="label">สถานะ</label>
          <select className="input" name="status" defaultValue="active">
            <option value="active">มีผล</option>
            <option value="lapsed">ขาดอายุ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>
        <div>
          <label className="label">เบี้ยประกัน (บาท)</label>
          <input className="input" name="premium" type="number" step="0.01" defaultValue="0" />
        </div>
        <div>
          <label className="label">ทุนประกัน (บาท)</label>
          <input className="input" name="sum_insured" type="number" step="0.01" defaultValue="0" />
        </div>
        <div>
          <label className="label">วันที่เริ่ม *</label>
          <input className="input" name="start_date" type="date" required />
        </div>
        <div>
          <label className="label">วันหมดอายุ *</label>
          <input className="input" name="end_date" type="date" required />
        </div>
        <div className="md:col-span-2">
          <label className="label">หมายเหตุ</label>
          <textarea className="input" name="note" rows={2} />
        </div>
      </div>
      <button className="btn-primary" type="submit">บันทึกกรมธรรม์</button>
    </form>
  );
}
