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

-- ตารางเก็บบันทึกเหตุการณ์ล่วงหน้า (หลายแถวต่อ 1 user)
create table work_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now()
);

-- ตารางเก็บ Web Push subscription (หลายแถวต่อ 1 user - 1 แถวต่อ 1 อุปกรณ์/เบราว์เซอร์)
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- เปิด Row Level Security ป้องกันไม่ให้เห็นข้อมูลคนอื่น
alter table ot_settings enable row level security;
alter table ot_entries enable row level security;
alter table work_notes enable row level security;
alter table push_subscriptions enable row level security;

-- Policy: เห็น/แก้ได้แค่ข้อมูลของตัวเอง
create policy "Users manage own settings" on ot_settings
  for all using (auth.uid() = user_id);

create policy "Users manage own entries" on ot_entries
  for all using (auth.uid() = user_id);

create policy "Users manage own work notes" on work_notes
  for all using (auth.uid() = user_id);

create policy "Users manage own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);
