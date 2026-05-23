-- === RUN THIS SQL IN SUPABASE SQL EDITOR ===

create table if not exists public.study_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  activity_type text not null check (
    activity_type in (
      'question_asked',
      'topic_completed',
      'topic_started',
      'topic_revision',
      'session_started',
      'mcq_attempted',
      'mcq_correct'
    )
  ),
  subject text,
  topic_name text,
  session_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.study_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_active_date date,
  streak_started_date date,
  total_active_days integer default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_study_activity_user_id on public.study_activity(user_id);
create index if not exists idx_study_activity_user_created on public.study_activity(user_id, created_at desc);
create index if not exists idx_study_activity_user_type on public.study_activity(user_id, activity_type);
create index if not exists idx_study_streaks_user_id on public.study_streaks(user_id);

alter table public.study_activity enable row level security;
alter table public.study_streaks enable row level security;

drop policy if exists study_activity_select_own on public.study_activity;
drop policy if exists study_activity_insert_own on public.study_activity;
drop policy if exists study_activity_update_own on public.study_activity;
drop policy if exists study_activity_delete_own on public.study_activity;

drop policy if exists study_streaks_select_own on public.study_streaks;
drop policy if exists study_streaks_insert_own on public.study_streaks;
drop policy if exists study_streaks_update_own on public.study_streaks;
drop policy if exists study_streaks_delete_own on public.study_streaks;

create policy study_activity_select_own
on public.study_activity
for select
to authenticated
using (auth.uid() = user_id);

create policy study_activity_insert_own
on public.study_activity
for insert
to authenticated
with check (auth.uid() = user_id);

create policy study_activity_update_own
on public.study_activity
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy study_activity_delete_own
on public.study_activity
for delete
to authenticated
using (auth.uid() = user_id);

create policy study_streaks_select_own
on public.study_streaks
for select
to authenticated
using (auth.uid() = user_id);

create policy study_streaks_insert_own
on public.study_streaks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy study_streaks_update_own
on public.study_streaks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy study_streaks_delete_own
on public.study_streaks
for delete
to authenticated
using (auth.uid() = user_id);

grant all on public.study_activity to authenticated;
grant all on public.study_streaks to authenticated;
grant all on public.study_activity to service_role;
grant all on public.study_streaks to service_role;

create or replace function public.set_study_streaks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_study_streaks_updated_at on public.study_streaks;
create trigger trg_study_streaks_updated_at
before update on public.study_streaks
for each row
execute function public.set_study_streaks_updated_at();
