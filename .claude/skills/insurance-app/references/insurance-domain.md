# Life insurance domain — what every feature must respect

This is the business knowledge encoded behind the data model. If a feature contradicts something here, surface it to the user before coding.

## The policy lifecycle

```
ออกกรมธรรม์ → Free-look (15 วัน) → มีผล (active)
                                      ↓
                              ครบกำหนดชำระงวด
                                ↙          ↘
                          ชำระตรงเวลา      ไม่ชำระ
                              ↓               ↓
                          ต่ออายุ          Grace period (31 วัน ทั่วไป)
                                              ↓
                                        ขาดอายุ (lapsed)
                                              ↓
                                  Reinstatement (ภายใน ~2-5 ปี)
                                              ↓
                                        Surrender / สิ้นสุด
```

- **Free-look period (ระยะพิจารณา)** 15 วันสำหรับประกันชีวิตทั่วไปในไทย — ลูกค้ายกเลิกแล้วได้เบี้ยคืนเต็ม. Status flow: `pending` → `active`. Our app doesn't model this yet; if added, add a `free_look_end` date.
- **Grace period (ระยะผ่อนผัน)** มาตรฐาน 31 วันหลังครบกำหนดชำระเบี้ย. Policy ยังคุ้มครองอยู่.
- **Lapse (ขาดอายุ)** เมื่อหมด grace แล้วยังไม่ชำระ. ความคุ้มครองหยุด.
- **Reinstatement (การต่ออายุ)** ทำได้ภายใน 2-5 ปีแล้วแต่กรมธรรม์ ต้องตรวจสุขภาพใหม่ + ชำระเบี้ยย้อนหลัง + ดอกเบี้ย.
- **Surrender (เวนคืน)** ลูกค้ายกเลิก ได้เงินค่าเวนคืน (cash value) — เฉพาะกรมธรรม์ที่มี.

## Premium vs sum insured

- **เบี้ยประกัน (premium)** ที่ลูกค้าจ่าย เป็นงวด
- **ทุนประกัน (sum insured)** ที่ผู้รับผลประโยชน์จะได้รับเมื่อเสียชีวิต/ครบกำหนด
- เบี้ย ≠ ทุน. ทุนมักสูงกว่าเบี้ยมาก (10-50 เท่า สำหรับ term/whole life)
- ผลิตภัณฑ์ออมทรัพย์ (endowment): เบี้ย ~= ทุน หารด้วยจำนวนปี

## Payment frequency (`payment_type`)

| ค่าในระบบ | จำนวนงวด/ปี | ผลต่อ commission timing |
|---|---|---|
| รายเดือน | 12 | คอมแบ่งจ่ายตามงวด |
| ราย 3 เดือน | 4 | |
| ราย 6 เดือน | 2 | |
| รายปี | 1 | คอมก้อนใหญ่ตอนต่ออายุ |
| ชำระครั้งเดียว | 1 ครั้ง | คอมก้อนเดียวตอนซื้อ |

`end_date` ใน schema คือวันหมดอายุของกรมธรรม์โดยรวม (ครบกำหนด) — **ไม่ใช่** วันครบกำหนดชำระงวดถัดไป. ถ้าจะแจ้งเตือนงวด ต้องคำนวณจาก `start_date` + `payment_type`.

## Commission (ค่าคอมมิชชั่น) — ตัวแทน

แบ่ง 2 ประเภทใหญ่:

- **FYC — First Year Commission** ค่าคอมปีแรก, สูง (15-40% ของเบี้ยปีแรก แล้วแต่ผลิตภัณฑ์)
- **RYC — Renewal Year Commission** ปีที่ 2 เป็นต้นไป, ต่ำกว่า (2-10%), จ่ายต่อเนื่องตามที่ลูกค้าจ่ายเบี้ย

หัวหน้าทีมได้ **override commission** จากผลงานของลูกทีม (มักเป็น % ของ FYC ของลูกทีม).

ในระบบของเรา: ตอนนี้ยังไม่มีฟิลด์ commission. ถ้าจะเพิ่ม แนะนำ:
- `policies.commission_rate REAL` (% ของเบี้ย)
- `policies.commission_type TEXT` (`FYC`/`RYC`)
- รายงานแยกตามปีเริ่ม

## Persistency rate

ตัวชี้วัดสำคัญที่บริษัทประกันใช้วัดคุณภาพตัวแทน:

- **13th month persistency** = % ของกรมธรรม์ที่ยังมีผลหลัง 13 เดือนจากวันออก
- **25th month persistency** = หลัง 25 เดือน

ตัวแทนที่ขายแล้วลูกค้า lapse ภายในปีแรก = คุณภาพต่ำ. บริษัทบางแห่งเรียกคืน FYC ถ้า lapse ใน 13 เดือนแรก (claw-back).

Query แนะนำสำหรับเพิ่ม:
```sql
SELECT
  CAST(SUM(CASE WHEN status='active' AND date(start_date,'+13 months') <= date('now') THEN 1 ELSE 0 END) AS REAL)
  / NULLIF(SUM(CASE WHEN date(start_date,'+13 months') <= date('now') THEN 1 ELSE 0 END), 0)
  AS persistency_13m
FROM policies WHERE ...
```

## Beneficiary (ผู้รับผลประโยชน์)

- ต้องระบุชื่อ + ความสัมพันธ์ + % การรับ (ถ้ามีหลายคน)
- ปัจจุบันเก็บเป็น TEXT เดียว — ถ้ามีหลายคน/มี % ให้แตกเป็นตาราง `beneficiaries (policy_id, name, relation, share_pct)`
- ผู้รับผลประโยชน์เปลี่ยนได้ระหว่างทาง — ต้องเก็บ history ถ้าเพิ่มฟีเจอร์นี้

## Compliance touchpoints

- **KYC / ตัวตนลูกค้า**: เลขบัตรประชาชน 13 หลัก, ที่อยู่, อาชีพ (อาชีพเสี่ยงมีผลต่อเบี้ย — ปัจจุบันยังไม่เก็บ)
- **Suitability (ความเหมาะสม)**: รายได้, ภาระทางการเงิน — ต้องประเมินก่อนเสนอ unit-linked / endowment ใหญ่
- **คปภ.** (สนง.คณะกรรมการกำกับและส่งเสริมการประกอบธุรกิจประกันภัย) — กำกับ
- **Cooling-off / Free-look** — สิทธิ์ยกเลิก 15 วัน
- ตัวแทนต้องมี ใบอนุญาตตัวแทนประกันชีวิต. ระบบควรเก็บ license_no, expiry — ปัจจุบันยังไม่เก็บ. ถ้าเพิ่ม role/onboarding ให้รวมด้วย.

## Customer relationship lifecycle (สิ่งที่ตัวแทนที่ดีทำ)

1. **Prospect** — รู้จัก, ยังไม่ซื้อ
2. **Onboarding** — ซื้อแรก, ออกกรมธรรม์, ส่งมอบ
3. **Service** — ติดต่อปีละ 1-2 ครั้ง, อัพเดทข้อมูล, แจ้งสิทธิ์
4. **Cross-sell / Up-sell** — เพิ่มกรมธรรม์ที่ 2, 3
5. **Claim support** — ช่วยเคลม
6. **Renewal / Retention** — ติดต่อก่อนต่ออายุ

ฟีเจอร์ที่ควรมีในอนาคต (เรียงตามผลกระทบ):
- ปฏิทินติดต่อ (next_contact_date) — สูงสุด
- ประวัติการติดต่อ
- แจ้งวันเกิดลูกค้า
- บันทึก claim
- แนะนำ cross-sell ตามอายุ/รายได้
