-- ============================================================
-- 1) เพิ่มคอลัมน์ที่ต้องใช้สำหรับ push reminder แบบ scheduled
--    (แยกเป็นคอลัมน์จริง ไม่ใส่ไว้ใน ot_settings.data เพราะฝั่งแอปจะ
--    upsert ทับ data ทั้งก้อนทุกครั้งที่ผู้ใช้แก้ settings - ถ้าเก็บไว้ใน
--    data ค่าที่ Edge Function เขียนจะหายไปตอน sync รอบถัดไป)
-- ============================================================

alter table ot_settings
  add column if not exists timezone text not null default 'Asia/Bangkok';

alter table ot_settings
  add column if not exists last_reminder_sent_date date;

comment on column ot_settings.timezone is
  'IANA timezone ของผู้ใช้ (เช่น Asia/Bangkok) ใช้เทียบเวลาเลิกงานฝั่ง server โดย send-push-reminders. ยังไม่มี UI ให้ผู้ใช้ตั้งเอง จะ default เป็น Asia/Bangkok เสมอ';

comment on column ot_settings.last_reminder_sent_date is
  'วันที่ (ตาม timezone ของผู้ใช้) ล่าสุดที่ send-push-reminders ส่งแจ้งเตือนไปแล้ว ใช้กันส่งซ้ำหลายครั้งในวันเดียว - เขียนโดย Edge Function เท่านั้น ห้ามให้ฝั่งแอปเขียนทับ';

-- ============================================================
-- 2) เปิด extension ที่ต้องใช้ (Supabase มีให้อยู่แล้ว แค่ enable)
--    pg_cron = ตัวตั้งเวลา, pg_net = ยิง HTTP request แบบ async จากใน DB
-- ============================================================

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- ============================================================
-- 3) เก็บ project URL และ service_role key ไว้ใน Supabase Vault
--    -----------------------------------------------------------------
--    ⚠️ ห้ามเอา service_role key ไปฝังตรงๆ ในคำสั่ง cron.schedule (และห้าม
--    commit ไฟล์ที่มีคีย์จริงขึ้น git) เพราะ pg_cron เก็บ source ของ job
--    (รวมถึงค่าคงที่ทุกตัวในนั้น) เป็น plain text ไว้ใน cron.job ซึ่งใครก็ตาม
--    ที่มีสิทธิ์อ่านตาราง (หรือเห็นไฟล์ migration นี้ใน git history) จะเห็น
--    คีย์นั้นทันที ใช้ Supabase Vault เก็บแทน แล้วให้ job ไป decrypt ตอนรัน
--
--    วิธีรัน: แก้ '<PROJECT_URL>' และ '<SERVICE_ROLE_KEY>' ด้านล่างเป็นค่า
--    จริงของโปรเจกต์คุณ (ดูได้จาก Project Settings > API) แล้ว "รันเฉพาะ
--    บล็อกนี้ตรงๆ ใน SQL Editor" อย่า commit ไฟล์เวอร์ชันที่ใส่ค่าจริงแล้ว
--    กลับเข้า git - เก็บไฟล์ในโปรเจกต์ไว้เป็น placeholder แบบนี้ต่อไป
--
--    ถ้าเคยสร้าง secret ชื่อนี้ไว้แล้วและต้องการเปลี่ยนค่า ให้ใช้
--    vault.update_secret(...) แทน ไม่ใช่ create_secret ซ้ำ (จะ error ชื่อซ้ำ)
-- ============================================================

select vault.create_secret('<PROJECT_URL>', 'project_url', 'Base URL ของโปรเจกต์ Supabase นี้ ใช้โดย pg_cron job send-push-reminders');
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key', 'service_role key ใช้โดย pg_cron job send-push-reminders เพื่อเรียก Edge Function');

-- ============================================================
-- 4) ตั้งเวลาให้เรียก Edge Function send-push-reminders ทุก 15 นาที
--    ไฟล์นี้ไม่มีคีย์จริงอยู่เลย เพราะดึงจาก Vault ตอนรันเสมอ จึง commit
--    เข้า git ได้ตามปกติ
-- ============================================================

-- ลบ job เดิมชื่อเดียวกันก่อน (เผื่อรัน migration นี้ซ้ำ) แล้วค่อยสร้างใหม่
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
where jobname = 'send-push-reminders-every-15-min';
