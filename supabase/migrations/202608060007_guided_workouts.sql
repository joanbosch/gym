alter table public.set_logs
  add column if not exists skipped boolean not null default false;

alter table public.set_logs
  drop constraint if exists set_logs_completion_state_check;

alter table public.set_logs
  add constraint set_logs_completion_state_check
  check (not (completed and skipped));

create index if not exists workout_sessions_active_strength_idx
  on public.workout_sessions (athlete_id, started_at desc)
  where status = 'in_progress';

comment on column public.set_logs.skipped is
  'True when the athlete explicitly skipped this prescribed set.';
