alter table public.body_measurements
  add column if not exists body_fat_percentage numeric(4,1)
  check (body_fat_percentage between 2 and 70);
