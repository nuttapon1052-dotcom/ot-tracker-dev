-- ============================================================
-- เปลี่ยน pg_cron ของ send-event-reminders จาก "วันละครั้ง 07:00" -> "ทุก 1 นาที"
--
-- เหตุผล: ตอนนี้ผู้ใช้เลือกเวลาแจ้งเตือนเองได้ (reminder_time ต่อ note) จึงต้อง
-- เช็คถี่ขึ้นเพื่อยิงให้ตรงเวลาที่เลือก ไม่ใช่รอเช็ควันละครั้ง ฝั่ง Edge Function
-- มี window (EVENT_REMINDER_WINDOW_MINUTES = 15) กันตกหล่น และกันส่งซ้ำด้วย
-- reminder_sent อยู่แล้ว
--
-- ต้องเคยรัน 20260713020000_reminder_auth_key.sql (มี secret reminder_auth_key
-- + project_url ใน Vault) มาก่อน รันบล็อกนี้ตรงๆ ใน Supabase SQL Editor
-- ============================================================

-- ลบ job เดิม (วันละครั้ง 07:00) และ job ชื่อใหม่ (เผื่อรันซ้ำ)
select cron.unschedule(jobid)
from cron.job
where jobname = 'send-event-reminders-daily-07-bangkok';

select cron.unschedule(jobid)
from cron.job
where jobname = 'send-event-reminders-every-min';

select cron.schedule(
  'send-event-reminders-every-min',
  '* * * * *', -- ทุก 1 นาที
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

-- ตรวจสอบ: ควรเห็นแถวเดียวชื่อ send-event-reminders-every-min, * * * * *, true
select jobid, jobname, schedule, active
from cron.job
where jobname in ('send-event-reminders-every-min', 'send-event-reminders-daily-07-bangkok');
