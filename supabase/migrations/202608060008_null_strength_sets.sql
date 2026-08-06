update public.set_logs
set completed = false,
    skipped = true,
    updated_at = now()
where completed
  and (coalesce(load_kg, 0) <= 0 or coalesce(reps, 0) <= 0);

alter table public.set_logs
  drop constraint if exists set_logs_completed_values_check;

alter table public.set_logs
  add constraint set_logs_completed_values_check
  check (not completed or (load_kg > 0 and reps > 0));

comment on constraint set_logs_completed_values_check on public.set_logs is
  'Completed strength sets must contain a positive load and repetition count; zero-value sets are skipped.';
