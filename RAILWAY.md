# Deploy บน Railway

## Variables ที่ต้องตั้ง

ไปที่ Railway → Project → Variables แล้วเพิ่ม:

| Variable | ค่า | หมายเหตุ |
|---|---|---|
| `AUTH_SECRET` | random string 32+ ตัว | สำคัญมาก อย่าใช้ค่า default |
| `INIT_ADMIN_USERNAME` | ชื่อ login ที่ต้องการ | สร้างครั้งเดียวตอน boot แรก |
| `INIT_ADMIN_PASSWORD` | รหัสผ่านที่ปลอดภัย | เปลี่ยนได้ทีหลังผ่านหน้า Profile |
| `INIT_ADMIN_NAME` | ชื่อ-นามสกุล หัวหน้า | |

สร้าง `AUTH_SECRET` ด้วย: `openssl rand -hex 32`

## Persistent Storage (สำคัญ — ข้อมูลหายถ้าไม่ทำ)

โดย default `data.db` อยู่ใน container ซึ่งจะหายทุก redeploy

**ขั้นตอนตั้ง Volume:**
1. Railway → Project → Add Service → Volume
2. ตั้ง Mount Path: `/data`
3. เพิ่ม Variable: `DB_PATH=/data/data.db`
4. Redeploy

หลังจากนั้นข้อมูลจะอยู่ใน Volume ไม่หายเมื่อ redeploy

## Node Version

ต้องใช้ Node 24+ (สำหรับ `node:sqlite` builtin)  
Railway จะอ่านจาก `engines.node` ใน package.json อัตโนมัติ

## Login ครั้งแรก

หลัง deploy ครั้งแรก login ด้วย credentials จาก `INIT_ADMIN_*`  
จากนั้น **เปลี่ยนรหัสผ่านทันที** ที่หน้า Profile (คลิกชื่อใน header)  
แล้วไปที่ `/supervisor/team` เพื่อเพิ่มตัวแทน
