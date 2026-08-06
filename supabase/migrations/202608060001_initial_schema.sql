create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'coach', 'athlete');
create type public.program_status as enum ('draft', 'published', 'archived');
create type public.assignment_status as enum ('scheduled', 'active', 'completed', 'cancelled');
create type public.session_status as enum ('planned', 'in_progress', 'completed', 'skipped');
create type public.session_kind as enum ('strength', 'cardio', 'recovery', 'rest', 'checkin');
create type public.email_status as enum ('pending', 'processing', 'sent', 'delivered', 'failed', 'suppressed');

create table public.profiles (
  id uuid primary key references public."user"(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null unique,
  role public.app_role not null default 'athlete',
  timezone text not null default 'Europe/Madrid',
  locale text not null default 'es-ES',
  suspended_at timestamptz,
  email_reminders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_athletes (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (coach_id, athlete_id),
  check (coach_id <> athlete_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  equipment text,
  instructions text,
  is_global boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (owner_id, name)
);

create table public.exercise_alternatives (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises(id) on delete cascade,
  primary key (exercise_id, alternative_exercise_id),
  check (exercise_id <> alternative_exercise_id)
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_weeks smallint not null check (duration_weeks between 1 and 52),
  status public.program_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_revisions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  status public.program_status not null default 'draft',
  change_summary text,
  source_revision_id uuid references public.program_revisions(id) on delete set null,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (program_id, revision_number)
);

create table public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.program_revisions(id) on delete cascade,
  week_number smallint not null check (week_number between 1 and 52),
  name text not null,
  focus text,
  target_rir text,
  is_deload boolean not null default false,
  unique (revision_id, week_number)
);

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.program_revisions(id) on delete cascade,
  week_id uuid not null references public.program_weeks(id) on delete cascade,
  name text not null,
  description text,
  kind public.session_kind not null,
  weekday smallint not null check (weekday between 1 and 7),
  duration_minutes smallint check (duration_minutes between 0 and 600),
  sort_order smallint not null default 0
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  sort_order smallint not null,
  sets smallint not null check (sets between 1 and 20),
  rep_min smallint check (rep_min between 0 and 1000),
  rep_max smallint check (rep_max between 0 and 1000 and rep_max >= rep_min),
  target_rir smallint check (target_rir between 0 and 4),
  rest_seconds smallint check (rest_seconds between 0 and 1800),
  load_suggestion_kg numeric(6,2) check (load_suggestion_kg >= 0),
  technical_cue text,
  unique (workout_template_id, sort_order)
);

create table public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  revision_id uuid not null references public.program_revisions(id) on delete restrict,
  starts_on date not null,
  status public.assignment_status not null default 'scheduled',
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.scheduled_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.program_assignments(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  revision_id uuid not null references public.program_revisions(id) on delete restrict,
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  scheduled_for date not null,
  kind public.session_kind not null,
  title text not null,
  status public.session_status not null default 'planned',
  snapshot jsonb not null default '{}'::jsonb,
  rescheduled_from date,
  created_at timestamptz not null default now(),
  unique (assignment_id, scheduled_for, title)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  scheduled_session_id uuid references public.scheduled_sessions(id) on delete set null,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  revision_id uuid references public.program_revisions(id) on delete restrict,
  status public.session_status not null default 'in_progress',
  snapshot jsonb not null,
  sleep_score smallint check (sleep_score between 1 and 5),
  energy_score smallint check (energy_score between 1 and 5),
  notes text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.set_logs (
  id uuid primary key,
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number smallint not null check (set_number between 1 and 20),
  load_kg numeric(7,2) check (load_kg between 0 and 1000),
  reps smallint check (reps between 0 and 1000),
  rir smallint check (rir between 0 and 4),
  completed boolean not null default false,
  client_changed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_session_id, exercise_id, set_number)
);

create table public.exercise_substitutions (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  original_exercise_id uuid not null references public.exercises(id),
  replacement_exercise_id uuid not null references public.exercises(id),
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.profiles(id) on delete cascade,
  measured_on date not null, weight_kg numeric(5,2) not null check (weight_kg between 20 and 400),
  created_at timestamptz not null default now(), unique (athlete_id, measured_on)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.profiles(id) on delete cascade,
  measured_on date not null, waist_cm numeric(5,2), chest_cm numeric(5,2), arm_cm numeric(5,2), thigh_cm numeric(5,2), notes text,
  created_at timestamptz not null default now(), unique (athlete_id, measured_on)
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.profiles(id) on delete cascade,
  taken_on date not null, view text not null check (view in ('front', 'side', 'back')), storage_path text not null unique,
  created_at timestamptz not null default now(), unique (athlete_id, taken_on, view)
);

create table public.cardio_logs (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.profiles(id) on delete cascade,
  performed_at timestamptz not null, activity_type text not null, duration_minutes smallint not null check (duration_minutes between 1 and 600),
  distance_km numeric(6,2), zone smallint check (zone between 1 and 5), rpe smallint check (rpe between 1 and 10), notes text,
  created_at timestamptz not null default now()
);

create table public.nutrition_daily_logs (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null, calories integer check (calories between 0 and 10000), protein_g numeric(6,1), carbs_g numeric(6,1), fat_g numeric(6,1), water_ml integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (athlete_id, log_date)
);

create table public.weekly_checkins (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid references public.program_assignments(id) on delete set null, week_number smallint not null check (week_number between 0 and 52),
  sleep_hours numeric(3,1), energy smallint check (energy between 1 and 5), hunger smallint check (hunger between 1 and 5),
  stress smallint check (stress between 1 and 5), soreness smallint check (soreness between 1 and 5), waist_cm numeric(5,2), athlete_notes text, coach_decision text,
  reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now(), unique (athlete_id, assignment_id, week_number)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade, entity_type text not null check (entity_type in ('program', 'session', 'checkin')),
  entity_id uuid not null, body text not null check (char_length(body) between 1 and 4000), created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, title text not null, body text not null, href text, read_at timestamptz, created_at timestamptz not null default now()
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(), recipient_user_id uuid references public.profiles(id) on delete set null,
  to_email text not null, template text not null, subject text not null, payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique check (char_length(idempotency_key) <= 256), status public.email_status not null default 'pending',
  attempts smallint not null default 0, next_attempt_at timestamptz not null default now(), provider_email_id text unique,
  last_error text, created_at timestamptz not null default now(), sent_at timestamptz, delivered_at timestamptz
);

create table public.email_events (
  id text primary key, provider_email_id text, event_type text not null, payload jsonb not null, received_at timestamptz not null default now()
);

create table public.email_suppressions (
  email text primary key, reason text not null check (reason in ('hard_bounce', 'complaint', 'soft_bounce', 'manual')),
  source_email_id text, created_at timestamptz not null default now()
);

create index on public.coach_athletes (athlete_id) where active;
create index on public.program_assignments (athlete_id, status);
create index on public.scheduled_sessions (athlete_id, scheduled_for);
create index on public.workout_sessions (athlete_id, started_at desc);
create index on public.set_logs (athlete_id, exercise_id, created_at desc);
create index on public.weigh_ins (athlete_id, measured_on desc);
create index on public.email_outbox (status, next_attempt_at) where status in ('pending', 'failed');

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger exercises_updated before update on public.exercises for each row execute function public.set_updated_at();
create trigger programs_updated before update on public.programs for each row execute function public.set_updated_at();
create trigger sessions_updated before update on public.workout_sessions for each row execute function public.set_updated_at();
create trigger sets_updated before update on public.set_logs for each row execute function public.set_updated_at();
create trigger nutrition_updated before update on public.nutrition_daily_logs for each row execute function public.set_updated_at();

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and p.suspended_at is null)
$$;
create function public.is_coach_of(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.coach_athletes ca where ca.coach_id = (select auth.uid()) and ca.athlete_id = target and ca.active)
$$;
create function public.can_access_athlete(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select target = (select auth.uid()) or public.is_admin() or public.is_coach_of(target)
$$;

create function public.create_program_draft(program_name text, program_description text, duration_weeks integer)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_program uuid; current_role public.app_role;
begin
  select role into current_role from public.profiles where id = (select auth.uid());
  if current_role not in ('coach', 'admin') then raise exception 'not authorized'; end if;
  insert into public.programs(owner_id, name, description, duration_weeks) values ((select auth.uid()), program_name, program_description, duration_weeks) returning id into new_program;
  insert into public.program_revisions(program_id, revision_number, created_by) values (new_program, 1, (select auth.uid()));
  return new_program;
end $$;

alter table public.profiles enable row level security;
alter table public.coach_athletes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_alternatives enable row level security;
alter table public.programs enable row level security;
alter table public.program_revisions enable row level security;
alter table public.program_weeks enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.program_assignments enable row level security;
alter table public.scheduled_sessions enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;
alter table public.exercise_substitutions enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.cardio_logs enable row level security;
alter table public.nutrition_daily_logs enable row level security;
alter table public.weekly_checkins enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;
alter table public.email_events enable row level security;
alter table public.email_suppressions enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin() or public.is_coach_of(id));
create policy profiles_admin_all on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy relationships_read on public.coach_athletes for select to authenticated using (coach_id = (select auth.uid()) or athlete_id = (select auth.uid()) or public.is_admin());
create policy relationships_admin on public.coach_athletes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());
create policy audit_insert on public.audit_logs for insert to authenticated with check (actor_id = (select auth.uid()) or public.is_admin());
create policy exercises_read on public.exercises for select to authenticated using (is_global or owner_id = (select auth.uid()) or public.is_admin());
create policy exercises_write on public.exercises for all to authenticated using (owner_id = (select auth.uid()) or public.is_admin()) with check (owner_id = (select auth.uid()) or public.is_admin());
create policy alternatives_read on public.exercise_alternatives for select to authenticated using (true);
create policy alternatives_write on public.exercise_alternatives for all to authenticated using (public.is_admin() or exists(select 1 from public.exercises e where e.id = exercise_id and e.owner_id = (select auth.uid()))) with check (public.is_admin() or exists(select 1 from public.exercises e where e.id = exercise_id and e.owner_id = (select auth.uid())));
create policy programs_read on public.programs for select to authenticated using (owner_id = (select auth.uid()) or public.is_admin() or exists(select 1 from public.program_assignments a where a.program_id = id and a.athlete_id = (select auth.uid())));
create policy programs_write on public.programs for all to authenticated using (owner_id = (select auth.uid()) or public.is_admin()) with check (owner_id = (select auth.uid()) or public.is_admin());
create policy revisions_read on public.program_revisions for select to authenticated using (exists(select 1 from public.programs p where p.id = program_id and (p.owner_id = (select auth.uid()) or public.is_admin() or exists(select 1 from public.program_assignments a where a.revision_id = program_revisions.id and a.athlete_id = (select auth.uid())))));
create policy revisions_write on public.program_revisions for all to authenticated using (exists(select 1 from public.programs p where p.id = program_id and (p.owner_id = (select auth.uid()) or public.is_admin()))) with check (exists(select 1 from public.programs p where p.id = program_id and (p.owner_id = (select auth.uid()) or public.is_admin())));

create policy weeks_read on public.program_weeks for select to authenticated using (exists(select 1 from public.program_revisions r join public.programs p on p.id=r.program_id where r.id=revision_id and (p.owner_id=(select auth.uid()) or public.is_admin() or exists(select 1 from public.program_assignments a where a.revision_id=r.id and a.athlete_id=(select auth.uid())))));
create policy weeks_write on public.program_weeks for all to authenticated using (exists(select 1 from public.program_revisions r join public.programs p on p.id=r.program_id where r.id=revision_id and r.status='draft' and (p.owner_id=(select auth.uid()) or public.is_admin()))) with check (exists(select 1 from public.program_revisions r join public.programs p on p.id=r.program_id where r.id=revision_id and r.status='draft' and (p.owner_id=(select auth.uid()) or public.is_admin())));
create policy templates_read on public.workout_templates for select to authenticated using (exists(select 1 from public.program_revisions r join public.programs p on p.id=r.program_id where r.id=revision_id and (p.owner_id=(select auth.uid()) or public.is_admin() or exists(select 1 from public.program_assignments a where a.revision_id=r.id and a.athlete_id=(select auth.uid())))));
create policy templates_write on public.workout_templates for all to authenticated using (exists(select 1 from public.program_revisions r join public.programs p on p.id=r.program_id where r.id=revision_id and r.status='draft' and (p.owner_id=(select auth.uid()) or public.is_admin()))) with check (exists(select 1 from public.program_revisions r join public.programs p on p.id=r.program_id where r.id=revision_id and r.status='draft' and (p.owner_id=(select auth.uid()) or public.is_admin())));
create policy workout_exercises_read on public.workout_exercises for select to authenticated using (exists(select 1 from public.workout_templates w join public.program_revisions r on r.id=w.revision_id join public.programs p on p.id=r.program_id where w.id=workout_template_id and (p.owner_id=(select auth.uid()) or public.is_admin() or exists(select 1 from public.program_assignments a where a.revision_id=r.id and a.athlete_id=(select auth.uid())))));
create policy workout_exercises_write on public.workout_exercises for all to authenticated using (exists(select 1 from public.workout_templates w join public.program_revisions r on r.id=w.revision_id join public.programs p on p.id=r.program_id where w.id=workout_template_id and r.status='draft' and (p.owner_id=(select auth.uid()) or public.is_admin()))) with check (exists(select 1 from public.workout_templates w join public.program_revisions r on r.id=w.revision_id join public.programs p on p.id=r.program_id where w.id=workout_template_id and r.status='draft' and (p.owner_id=(select auth.uid()) or public.is_admin())));

create policy assignments_read on public.program_assignments for select to authenticated using (public.can_access_athlete(athlete_id));
create policy assignments_coach_write on public.program_assignments for all to authenticated using (coach_id = (select auth.uid()) or public.is_admin()) with check ((coach_id = (select auth.uid()) and public.is_coach_of(athlete_id)) or public.is_admin());
create policy scheduled_read on public.scheduled_sessions for select to authenticated using (public.can_access_athlete(athlete_id));
create policy scheduled_coach_write on public.scheduled_sessions for all to authenticated using (public.is_coach_of(athlete_id) or public.is_admin()) with check (public.is_coach_of(athlete_id) or public.is_admin());
create policy sessions_read on public.workout_sessions for select to authenticated using (public.can_access_athlete(athlete_id));
create policy sessions_athlete_write on public.workout_sessions for all to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create policy sets_read on public.set_logs for select to authenticated using (public.can_access_athlete(athlete_id));
create policy sets_athlete_write on public.set_logs for all to authenticated using (athlete_id = (select auth.uid())) with check (athlete_id = (select auth.uid()));
create policy substitutions_read on public.exercise_substitutions for select to authenticated using (public.can_access_athlete(athlete_id));
create policy substitutions_write on public.exercise_substitutions for all to authenticated using (athlete_id=(select auth.uid())) with check (athlete_id=(select auth.uid()));

create policy weigh_read on public.weigh_ins for select to authenticated using (public.can_access_athlete(athlete_id));
create policy weigh_write on public.weigh_ins for all to authenticated using (athlete_id=(select auth.uid())) with check (athlete_id=(select auth.uid()));
create policy measurements_read on public.body_measurements for select to authenticated using (public.can_access_athlete(athlete_id));
create policy measurements_write on public.body_measurements for all to authenticated using (athlete_id=(select auth.uid())) with check (athlete_id=(select auth.uid()));
create policy photos_read on public.progress_photos for select to authenticated using (public.can_access_athlete(athlete_id));
create policy photos_write on public.progress_photos for all to authenticated using (athlete_id=(select auth.uid())) with check (athlete_id=(select auth.uid()));
create policy cardio_read on public.cardio_logs for select to authenticated using (public.can_access_athlete(athlete_id));
create policy cardio_write on public.cardio_logs for all to authenticated using (athlete_id=(select auth.uid())) with check (athlete_id=(select auth.uid()));
create policy nutrition_read on public.nutrition_daily_logs for select to authenticated using (public.can_access_athlete(athlete_id));
create policy nutrition_write on public.nutrition_daily_logs for all to authenticated using (athlete_id=(select auth.uid())) with check (athlete_id=(select auth.uid()));
create policy checkins_read on public.weekly_checkins for select to authenticated using (public.can_access_athlete(athlete_id));
create policy checkins_athlete_insert on public.weekly_checkins for insert to authenticated with check (athlete_id=(select auth.uid()));
create policy checkins_coach_update on public.weekly_checkins for update to authenticated using (athlete_id=(select auth.uid()) or public.is_coach_of(athlete_id) or public.is_admin()) with check (athlete_id=(select auth.uid()) or public.is_coach_of(athlete_id) or public.is_admin());
create policy comments_read on public.comments for select to authenticated using (public.can_access_athlete(athlete_id));
create policy comments_insert on public.comments for insert to authenticated with check (author_id=(select auth.uid()) and public.can_access_athlete(athlete_id));
create policy notifications_own on public.notifications for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy email_admin_read on public.email_outbox for select to authenticated using (public.is_admin());
create policy email_events_admin_read on public.email_events for select to authenticated using (public.is_admin());
create policy suppressions_admin_read on public.email_suppressions for select to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 10485760, array['image/jpeg','image/png','image/heic','image/webp'])
on conflict (id) do nothing;
create policy storage_photo_read on storage.objects for select to authenticated using (bucket_id='progress-photos' and public.can_access_athlete(((storage.foldername(name))[1])::uuid));
create policy storage_photo_insert on storage.objects for insert to authenticated with check (bucket_id='progress-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy storage_photo_update on storage.objects for update to authenticated using (bucket_id='progress-photos' and owner_id=(select auth.uid())::text) with check (bucket_id='progress-photos' and owner_id=(select auth.uid())::text);
create policy storage_photo_delete on storage.objects for delete to authenticated using (bucket_id='progress-photos' and owner_id=(select auth.uid())::text);

grant execute on function public.create_program_draft(text,text,integer) to authenticated;
