-- ============================================================
-- เปลี่ยน pg_cron ของ send-push-reminders จากทุก 15 นาที -> ทุก 1 นาที
--
-- เหตุผล: ต้องการให้ "แจ้งเตือนเวลาเลิกงาน" ยิงตรงเวลาเป้าหมายเป๊ะ (เลิกงาน +
-- 15 นาที) สำหรับ "ทุก" เวลาเลิกงาน ไม่ใช่แค่เวลาที่ลงตัวกับ 15 นาที เช่น
-- เลิกงาน 20:07 -> ต้องเตือน 20:22 พอดี ถ้า cron รันทุก 15 นาที (:00/:15/:30/:45)
-- จะยิงได้เร็วสุดที่ 20:30 (ช้าไป ~8 นาที) การรันทุกนาทีทำให้ยิงที่ 20:22 พอดีได้
--
-- ฝั่ง Edge Function ปรับ REMINDER_WINDOW_MINUTES = 2 แล้ว (จากเดิม 15) เพื่อให้
-- ยิงเฉพาะนาทีที่ตรงเป้าหมาย ไม่ใช่ทั้งช่วง 15 นาที - เตือนวันละครั้งเหมือนเดิม
-- (กันซ้ำด้วย last_reminder_sent_date) ไม่มีผลกับ send-event-reminders (คนละ job)
--
-- ⚠️ ไฟล์นี้ไม่มีคีย์จริงอยู่เลย (ดึง project_url / reminder_auth_key จาก Vault
-- ตอนรัน) จึง commit เข้า git ได้ตามปกติ รันบล็อกนี้ตรงๆ ใน Supabase SQL Editor
-- ต้องเคยรัน 20260713020000_reminder_auth_key.sql (สร้าง secret reminder_auth_key
-- ใน Vault) มาก่อนแล้ว
-- ============================================================

-- ลบ job เดิม (ชื่อเดียวกัน ทุก 15 นาที) ก่อน แล้วสร้างใหม่เป็นทุก 1 นาที
select cron.unschedule(jobid)
from cron.job
where jobname = 'send-push-reminders-every-15-min';

-- ใช้ชื่อ job ใหม่ให้ตรงกับความถี่ที่เปลี่ยนไป (กันสับสนกับของเดิม) และเผื่อรัน
-- migration นี้ซ้ำก็ลบตัวเองก่อนด้วย
select cron.unschedule(jobid)
from cron.job
where jobname = 'send-push-reminders-every-min';

select cron.schedule(
  'send-push-reminders-every-min',
  '* * * * *', -- ทุก 1 นาที
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-push-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Reminder-Auth', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_auth_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- ตรวจสอบว่า job ใหม่ถูกสร้างแล้ว และ job เก่าหายไปแล้ว
select jobid, jobname, schedule, active
from cron.job
where jobname in ('send-push-reminders-every-min', 'send-push-reminders-every-15-min');
