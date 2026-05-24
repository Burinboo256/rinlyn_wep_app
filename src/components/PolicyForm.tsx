import { listProducts } from '@/lib/queries';

export default function PolicyForm({ action }: { action: (fd: FormData) => void }) {
  const products = listProducts();
  const catLabel: Record<string, string> = {
    life: 'ประกันชีวิต', annuity: 'บำนาญ', health: 'สุขภาพ/โรคร้ายแรง', pa: 'อุบัติเหตุ',
  };
  return (
    <form action={action} className="card space-y-4">
      <h3 className="font-semibold">เพิ่มกรมธรรม์</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">เลขที่กรมธรรม์</label>
          <input className="input" name="policy_no" />
        </div>
        <div>
          <label className="label">ผลิตภัณฑ์ *</label>
          <select className="input" name="product_name" required>
            <option value="">— เลือกผลิตภัณฑ์ —</option>
            {Object.entries(catLabel).map(([cat, catTh]) => {
              const group = products.filter(p => p.category === cat);
              if (!group.length) return null;
              return (
                <optgroup key={cat} label={catTh}>
                  {group.map(p => (
                    <option key={p.id} value={p.name}
                      data-rate={p.default_commission_rate}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            <option value="__custom__">อื่นๆ (พิมพ์เอง)</option>
          </select>
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
          <label className="label">เบี้ยประกัน (฿)</label>
          <input className="input" name="premium" type="number" step="0.01" defaultValue="0" />
        </div>
        <div>
          <label className="label">ทุนประกัน (฿)</label>
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

        {/* Commission */}
        <div>
          <label className="label">ประเภทค่าคอม</label>
          <select className="input" name="commission_type" defaultValue="FYC">
            <option value="FYC">FYC (ปีแรก)</option>
            <option value="RYC">RYC (ปีต่อ)</option>
          </select>
        </div>
        <div>
          <label className="label">อัตราค่าคอม (%)</label>
          <input className="input" name="commission_rate" type="number" step="0.01" defaultValue="0" min="0" max="100" />
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
