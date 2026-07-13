# OT Tracker — บริบทโปรเจกต์

## ภาพรวม
เว็บแอปบันทึกเวลาทำงาน/OT เขียนด้วย vanilla JS (ไม่มี build step, ไม่มี bundler) เป็น PWA มี service worker

## Deployment & Repo
- **Repo ทดสอบ (ใช้ตัวนี้เสมอ)**: nuttapon1052-dotcom/ot-tracker-dev
- **URL ทดสอบ**: https://nuttapon1052-dotcom.github.io/ot-tracker-dev/
- **Repo หลักที่ผู้ใช้จริงใช้อยู่**: nuttapon1052-dotcom/OT-tracker (ห้ามแตะจนกว่าเจ้าของจะสั่ง)
- ผู้ใช้ทดสอบผ่าน GitHub Pages เท่านั้น ไม่ใช่ localhost — แก้ไฟล์ในเครื่องอย่างเดียวไม่มีผลจนกว่าจะ push ขึ้น repo

## Backend: Supabase
- Project ref: tnbxahwxiocgmabrajpz
- URL: https://tnbxahwxiocgmabrajpz.supabase.co
- ใช้ Auth (Google OAuth), Database (PostgreSQL), Edge Functions
- ตารางที่มี: ot_entries, ot_settings, work_notes, push_subscriptions, todos
- ผู้ใช้ **ไม่ได้ใช้ supabase db push** — ต้อง copy โค้ด SQL ไปรันเองใน Supabase SQL Editor เสมอ

## ฟีเจอร์ที่ทำเสร็จแล้ว
- Google Login ผ่าน Supabase Auth
- Sync ข้อมูล OT ขึ้น cloud (pushStateToCloud/pullStateFromCloud)
- Export Excel เลือกช่วงวันที่ได้ (SheetJS ผ่าน CDN)
- เป้าหมาย OT รายเดือน + progress bar
- เปรียบเทียบ OT เดือนต่อเดือน
- วันหยุดราชการ 8 ประเทศ (Nager.Date API + static bundle สำหรับ TH/TW/IL/MY) แปลชื่อเป็นไทยครบ
- บันทึกเหตุการณ์ล่วงหน้า (work_notes) + แจ้งเตือนล่วงหน้า 1 วัน
- แจ้งเตือนเมื่อถึงเวลาเลิกงาน (ทำงานเฉพาะตอนเปิดแท็บ)
- Web Push Notification (ทำงานแม้ปิดแอป) — Stage 1, 2 เสร็จแล้ว

## กฎสำคัญที่ต้องทำทุกครั้งที่ทำงานเสร็จ
สรุป "ขั้นตอนที่ผู้ใช้ต้องทำเองต่อ" เป็นข้อๆ ให้ชัดเจนเสมอ:
1. **ถ้าแก้ database schema** → แสดงโค้ด SQL เต็มๆ ที่ต้อง copy ไปรันใน Supabase SQL Editor (ห้ามบอกแค่ "รัน migration" เพราะผู้ใช้หาไฟล์ไม่เจอ)
2. **ถ้าแก้ไฟล์ frontend** → บอกว่าต้อง push ขึ้น repo ot-tracker-dev (ถ้าผู้ใช้อนุญาตให้ push เอง ให้รัน git add/commit/push ให้เลย)
3. **ถ้าต้องตั้งค่าใน Supabase Dashboard** → บอกเมนูที่ต้องเข้าให้ชัดเจน (เช่น Authentication → URL Configuration)
4. **ถ้าต้องรันคำสั่ง terminal** → เขียนคำสั่งเต็มๆ พร้อม ! นำหน้า
5. **บอกวิธีทดสอบว่าสำเร็จ** — เช็คที่ไหน ดูอะไร

## ข้อควรระวังที่เจอบ่อย
- **Service Worker cache**: ทุกครั้งที่ push โค้ดใหม่ ต้องเตือนผู้ใช้ให้ hard refresh (Ctrl+Shift+R) หรือใช้ incognito ไม่งั้นจะเห็นโค้ดเก่า
- **ห้ามขอ secret key**: Service Role Key, VAPID Private Key, Access Token — ห้ามขอให้ผู้ใช้ส่งมาให้ดู ให้ผู้ใช้รันเองในเทอร์มินัลเท่านั้น
- **Brave browser บล็อก Push API** — ถ้าทดสอบ push ให้ใช้ Chrome/Edge/Safari แทน

## คำสั่งที่ใช้บ่อย
- Deploy Edge Function: `! supabase functions deploy <function-name>`
- ตั้งค่า secret: `! supabase secrets set KEY=value`
- Push ขึ้น GitHub: `! git add . && git commit -m "message" && git push`
