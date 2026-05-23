# KPIs the supervisor view should surface

Order by what actually drives an agency manager's day.

## Tier 1 — daily decisions

| KPI | คำอธิบาย | สูตร / query hint |
|---|---|---|
| Expiring this week / month | กรมธรรม์ใกล้หมดอายุ ต้องโทรต่อ | `expiringPolicies(scope, 7/30)` (มีแล้ว) |
| Idle agents | ตัวแทนที่ไม่มีกรมธรรม์ใหม่ใน 30 วัน | `MAX(p.created_at) < date('now','-30 days')` หรือไม่มีเลย |
| Lapsed last 30d | ลูกค้าที่ขาดอายุเดือนนี้ | `status='lapsed' AND end_date >= date('now','-30 days')` |
| New policies today | กระตุ้น momentum | `COUNT(*) WHERE date(created_at)=date('now')` |

## Tier 2 — รายเดือน

| KPI | คำอธิบาย |
|---|---|
| FYP (First Year Premium) เดือนนี้ | `SUM(premium) WHERE date(start_date) >= date('now','start of month')` |
| จำนวนกรมธรรม์ใหม่เดือนนี้ | นับ policies ที่ start ในเดือน |
| Average premium per policy | บอกคุณภาพ portfolio |
| Active customers count | ลูกค้าที่มีอย่างน้อย 1 policy active |
| Policies per customer | cross-sell depth |

## Tier 3 — รายไตรมาส/ปี

| KPI | คำอธิบาย |
|---|---|
| 13-month persistency | % ของกรมธรรม์ที่ยังอยู่หลัง 13 เดือน (ดู insurance-domain.md) |
| 25-month persistency | หลัง 25 เดือน |
| Agent recruiting | ตัวแทนใหม่ที่ supervisor recruit ในปีนี้ |
| Total team APE | Annual Premium Equivalent — เบี้ยรายปี + 10% ของ single premium |

## Layout แนะนำสำหรับ dashboard

```
[ Today ]   ลูกค้าต้องติดต่อ 7 วัน | ขาดอายุสัปดาห์นี้ | กรมธรรม์ใหม่วันนี้
[ Month ]   FYP MTD | จำนวน policies MTD | ลูกค้าใหม่ MTD | active agents
[ Quality ] persistency 13m | persistency 25m | avg premium | policies/customer
[ Team ]    ตารางตัวแทน + แต่ละคนกี่ลูกค้า/กี่ policy/FYP/idle days
[ Alerts ]  idle agents 30+ days | lapsed this week | expiring 30d
```

## คำเตือน

- Persistency คำนวณยากเพราะต้องนับ "policies that *could* persist past 13m" (cohort วัย ≥ 13 เดือนเท่านั้น)
- อย่ารวมกรมธรรม์ที่ `status='cancelled'` ใน FYP เพราะถูก free-look
- "Active" หมายถึง `status='active' AND date('now') BETWEEN start_date AND end_date`
