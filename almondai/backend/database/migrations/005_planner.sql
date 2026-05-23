-- === RUN THIS SQL IN SUPABASE SQL EDITOR ===

create table if not exists public.student_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exam_name text not null,
  exam_date date not null,
  exam_type text check (exam_type in ('university', 'neet_pg', 'fmge', 'internal', 'other')) default 'university',
  subjects text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  exam_id uuid not null references public.student_exams(id) on delete cascade,
  generated_at timestamptz default now(),
  exam_date date not null,
  days_remaining integer not null,
  plan_data jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.daily_plan_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  plan_date date not null,
  topics_planned integer default 0,
  topics_completed integer default 0,
  is_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, plan_id, plan_date)
);

create index if not exists idx_student_exams_user_id on public.student_exams(user_id);
create index if not exists idx_student_exams_user_exam_date on public.student_exams(user_id, exam_date);
create index if not exists idx_student_exams_user_active on public.student_exams(user_id, is_active);
create index if not exists idx_study_plans_user_id on public.study_plans(user_id);
create index if not exists idx_study_plans_exam_id on public.study_plans(exam_id);
create index if not exists idx_daily_plan_progress_user_plan on public.daily_plan_progress(user_id, plan_id);

alter table public.student_exams enable row level security;
alter table public.study_plans enable row level security;
alter table public.daily_plan_progress enable row level security;

drop policy if exists student_exams_select_own on public.student_exams;
drop policy if exists student_exams_insert_own on public.student_exams;
drop policy if exists student_exams_update_own on public.student_exams;
drop policy if exists student_exams_delete_own on public.student_exams;

drop policy if exists study_plans_select_own on public.study_plans;
drop policy if exists study_plans_insert_own on public.study_plans;
drop policy if exists study_plans_update_own on public.study_plans;
drop policy if exists study_plans_delete_own on public.study_plans;

drop policy if exists daily_plan_progress_select_own on public.daily_plan_progress;
drop policy if exists daily_plan_progress_insert_own on public.daily_plan_progress;
drop policy if exists daily_plan_progress_update_own on public.daily_plan_progress;
drop policy if exists daily_plan_progress_delete_own on public.daily_plan_progress;

create policy student_exams_select_own
on public.student_exams
for select
to authenticated
using (auth.uid() = user_id);

create policy student_exams_insert_own
on public.student_exams
for insert
to authenticated
with check (auth.uid() = user_id);

create policy student_exams_update_own
on public.student_exams
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy student_exams_delete_own
on public.student_exams
for delete
to authenticated
using (auth.uid() = user_id);

create policy study_plans_select_own
on public.study_plans
for select
to authenticated
using (auth.uid() = user_id);

create policy study_plans_insert_own
on public.study_plans
for insert
to authenticated
with check (auth.uid() = user_id);

create policy study_plans_update_own
on public.study_plans
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy study_plans_delete_own
on public.study_plans
for delete
to authenticated
using (auth.uid() = user_id);

create policy daily_plan_progress_select_own
on public.daily_plan_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy daily_plan_progress_insert_own
on public.daily_plan_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy daily_plan_progress_update_own
on public.daily_plan_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy daily_plan_progress_delete_own
on public.daily_plan_progress
for delete
to authenticated
using (auth.uid() = user_id);

grant all on public.student_exams to authenticated;
grant all on public.study_plans to authenticated;
grant all on public.daily_plan_progress to authenticated;
grant all on public.student_exams to service_role;
grant all on public.study_plans to service_role;
grant all on public.daily_plan_progress to service_role;

create or replace function public.set_student_exams_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_student_exams_updated_at on public.student_exams;
create trigger trg_student_exams_updated_at
before update on public.student_exams
for each row
execute function public.set_student_exams_updated_at();

create or replace function public.set_study_plans_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_study_plans_updated_at on public.study_plans;
create trigger trg_study_plans_updated_at
before update on public.study_plans
for each row
execute function public.set_study_plans_updated_at();

create or replace function public.set_daily_plan_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_daily_plan_progress_updated_at on public.daily_plan_progress;
create trigger trg_daily_plan_progress_updated_at
before update on public.daily_plan_progress
for each row
execute function public.set_daily_plan_progress_updated_at();
