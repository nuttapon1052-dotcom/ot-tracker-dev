-- ตารางเก็บการตั้งค่า (1 แถวต่อ 1 user)
create table ot_settings (
  user_id uuid references auth.users(id) primary key,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ตารางเก็บรายการบันทึกเวลา (หลายแถวต่อ 1 user)
create table ot_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  date date not null,
  time_in text,
  time_out text,
  ot_multiplier numeric,
  note text,
  created_at timestamptz default now()
);

-- เปิด Row Level Security ป้องกันไม่ให้เห็นข้อมูลคนอื่น
alter table ot_settings enable row level security;
alter table ot_entries enable row level security;

-- Policy: เห็น/แก้ได้แค่ข้อมูลของตัวเอง
create policy "Users manage own settings" on ot_settings
  for all using (auth.uid() = user_id);

create policy "Users manage own entries" on ot_entries
  for all using (auth.uid() = user_id);
