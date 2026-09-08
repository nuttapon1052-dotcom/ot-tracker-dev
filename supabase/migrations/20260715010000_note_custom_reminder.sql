-- ============================================================
-- เพิ่มคอลัมน์สำหรับ "เลือกวัน/เวลาแจ้งเตือนเอง" ต่อ work_note
--
-- เดิม send-event-reminders เตือนล่วงหน้า 1 วันตอน 07:00 แบบตายตัว เปลี่ยนมาให้
-- ผู้ใช้เลือกวัน (reminder_date) + เวลา (reminder_time, รูปแบบ "HH:MM" ตาม
-- timezone ของผู้ใช้ใน ot_settings.timezone) เองต่อเหตุการณ์
--
-- reminder_sent มีอยู่แล้วจาก 20260713000000_event_reminders.sql - ใช้ต่อ
-- แต่ตอนนี้ client จะ round-trip ค่านี้กลับมาด้วย (noteToRow/rowToNote) เพราะ
-- client ลบ+เขียน work_notes ใหม่ทั้งชุดทุกครั้งที่ sync ถ้าไม่ round-trip
-- ค่าที่ server เขียน (reminder_sent=true) จะถูก reset ทุกครั้งที่ sync
--
-- รันบล็อกนี้ตรงๆ ใน Supabase SQL Editor (idempotent รันซ้ำได้)
-- ============================================================

alter table work_notes
  add column if not exists reminder_enabled boolean not null default false;

alter table work_notes
  add column if not exists reminder_date date;

alter table work_notes
  add column if not exists reminder_time text;

comment on column work_notes.reminder_enabled is
  'true = ผู้ใช้ตั้งการแจ้งเตือนสำหรับเหตุการณ์นี้ไว้';
comment on column work_notes.reminder_date is
  'วันที่ต้องการให้แจ้งเตือน (ตาม timezone ของผู้ใช้) - ใช้โดย send-event-reminders';
comment on column work_notes.reminder_time is
  'เวลาที่ต้องการให้แจ้งเตือน รูปแบบ HH:MM (ตาม timezone ของผู้ใช้)';
