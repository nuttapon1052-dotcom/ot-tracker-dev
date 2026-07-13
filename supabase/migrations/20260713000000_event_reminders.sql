ALTER TABLE work_notes
ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN work_notes.reminder_sent IS
'true = ส่งแจ้งเตือนล่วงหน้า 1 วันไปแล้ว กันส่งซ้ำ';
