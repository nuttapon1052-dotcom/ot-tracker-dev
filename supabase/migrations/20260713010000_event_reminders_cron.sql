-- ============================================================
-- ตั้งเวลาให้เรียก Edge Function send-event-reminders วันละครั้ง
-- เวลา 07:00 เวลาไทย (Asia/Bangkok = UTC+7) -> 00:00 UTC
--
-- ไฟล์นี้ไม่มีคีย์จริงอยู่เลย เพราะดึง project_url / service_role_key
-- จาก Vault เหมือน pattern ของ send-push-reminders (ดู
-- 20260712000000_push_reminders.sql) - สมมติว่า secret สองตัวนี้ถูก
-- สร้างไว้แล้วจาก migration นั้น จึงไม่ต้อง create_secret ซ้ำที่นี่
-- ============================================================

-- ลบ job เดิมชื่อเดียวกันก่อน (เผื่อรัน migration นี้ซ้ำ) แล้วค่อยสร้างใหม่
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
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- ตรวจสอบว่า schedule ถูกสร้างแล้ว
select jobid, jobname, schedule, active
from cron.job
where jobname = 'send-event-reminders-daily-07-bangkok';
