alter table public.body_measurements
  add column if not exists height_cm numeric(5,2) check (height_cm between 100 and 250),
  add column if not exists neck_cm numeric(5,2) check (neck_cm between 20 and 80),
  add column if not exists hip_cm numeric(5,2) check (hip_cm between 40 and 250),
  add column if not exists biological_sex text check (biological_sex in ('male', 'female')),
  add column if not exists body_fat_method text check (body_fat_method in ('manual', 'hodgdon_beckett'));

update public.body_measurements
set body_fat_method = 'manual'
where body_fat_percentage is not null and body_fat_method is null;
