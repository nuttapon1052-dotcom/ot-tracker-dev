-- ============================================================
-- เปลี่ยน pg_cron ให้เรียก send-push-reminders และ send-event-reminders
-- ด้วย REMINDER_AUTH_KEY แทน service_role_key (ตาม auth check ใหม่ใน
-- ทั้งสอง Edge Function - ดู supabase/functions/send-push-reminders/index.ts
-- และ supabase/functions/send-event-reminders/index.ts)
--
-- ส่ง REMINDER_AUTH_KEY ผ่าน header ชื่อเอง "X-Reminder-Auth" แทนที่จะใส่ใน
-- Authorization header เพราะ Supabase gateway จะตรวจสอบค่าใน Authorization
-- header เองก่อนถึง Edge Function เสมอ (ไม่ว่า verify_jwt จะปิดไว้หรือไม่)
-- แล้ว reject ค่าที่ไม่ใช่ JWT/apikey ที่ถูกต้องทันที ทำให้ REMINDER_AUTH_KEY
-- (เป็น plain string ธรรมดา ไม่ใช่ JWT) ไปไม่ถึงโค้ดที่เราเช็คเองเลย
--
-- ไม่ลบ secret 'service_role_key' เดิมใน Vault ทิ้ง เผื่อมีที่อื่นใช้อยู่
-- แค่เพิ่ม secret ใหม่ชื่อ 'reminder_auth_key' แล้วชี้ทั้งสอง cron job
-- ไปใช้ตัวใหม่แทน
--
-- ⚠️ ห้ามฝังคีย์จริงตรงๆ แล้ว commit ไฟล์นี้กลับเข้า git - แก้ค่า
-- '<REMINDER_AUTH_KEY>' ด้านล่างเป็นค่าจริงเฉพาะตอนรันใน SQL Editor
-- เท่านั้น เก็บไฟล์ในโปรเจกต์ไว้เป็น placeholder แบบนี้ต่อไป
--
-- ค่า REMINDER_AUTH_KEY ที่ใส่ในนี้ต้องตรงกับค่าที่ตั้งไว้ฝั่ง Edge Function
-- ด้วยคำสั่ง: supabase secrets set REMINDER_AUTH_KEY=<ค่าเดียวกัน>
-- (สุ่มค่าใหม่ได้ เช่นรัน `openssl rand -hex 32` ในเทอร์มินัล)
-- ============================================================

-- 1) เก็บ REMINDER_AUTH_KEY ไว้ใน Vault
--    ถ้าเคยสร้าง secret ชื่อนี้ไว้แล้วและต้องการเปลี่ยนค่า ให้ใช้
--    vault.update_secret(...) แทน ไม่ใช่ create_secret ซ้ำ (จะ error ชื่อซ้ำ)
select vault.create_secret('<REMINDER_AUTH_KEY>', 'reminder_auth_key', 'REMINDER_AUTH_KEY ใช้โดย pg_cron เพื่อเรียก send-push-reminders / send-event-reminders (แทน service_role_key เดิม)');

-- ============================================================
-- 2) re-schedule send-push-reminders ให้ใช้ reminder_auth_key
-- ============================================================

select cron.unschedule(jobid)
from cron.job
where jobname = 'send-push-reminders-every-15-min';

select cron.schedule(
  'send-push-reminders-every-15-min',
  '*/15 * * * *',
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

-- ============================================================
-- 3) re-schedule send-event-reminders ให้ใช้ reminder_auth_key
-- ============================================================

select cron.unschedule(jobid)
from cron.job
where jobname = 'send-event-reminders-daily-07-bangkok';

select cron.schedule(
  'send-event-reminders-daily-07-bangkok',
  '0 0 * * *', -- 00:00 UTC = 07:00 Asia/Bangkok
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Reminder-Auth', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_auth_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- ตรวจสอบว่าทั้งสอง job re-schedule สำเร็จและชี้ไปที่ secret ใหม่แล้ว
select jobid, jobname, schedule, active
from cron.job
where jobname in ('send-push-reminders-every-15-min', 'send-event-reminders-daily-07-bangkok');
