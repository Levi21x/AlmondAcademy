-- === RUN THIS SQL IN SUPABASE SQL EDITOR ===

create table if not exists public.syllabus_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  year integer not null check (year between 1 and 5),
  mode text not null check (mode in ('mbbs', 'neet_pg', 'both')) default 'mbbs',
  description text,
  icon text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.syllabus_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.syllabus_subjects(id) on delete cascade,
  name text not null,
  description text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')) default 'medium',
  is_high_yield boolean default false,
  neet_pg_relevant boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now(),
  unique(subject_id, name)
);

create table if not exists public.student_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic_id uuid not null references public.syllabus_topics(id) on delete cascade,
  status text check (status in ('not_started', 'in_progress', 'completed', 'needs_revision')) default 'not_started',
  completed_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, topic_id)
);

create index if not exists idx_syllabus_topics_subject_id on public.syllabus_topics(subject_id);
create index if not exists idx_syllabus_topics_subject_sort on public.syllabus_topics(subject_id, sort_order);
create index if not exists idx_student_topic_progress_user on public.student_topic_progress(user_id);
create index if not exists idx_student_topic_progress_user_topic on public.student_topic_progress(user_id, topic_id);
create index if not exists idx_student_topic_progress_topic on public.student_topic_progress(topic_id);

alter table public.syllabus_subjects enable row level security;
alter table public.syllabus_topics enable row level security;
alter table public.student_topic_progress enable row level security;

drop policy if exists syllabus_subjects_select_authenticated on public.syllabus_subjects;
drop policy if exists syllabus_topics_select_authenticated on public.syllabus_topics;
drop policy if exists student_topic_progress_select_own on public.student_topic_progress;
drop policy if exists student_topic_progress_insert_own on public.student_topic_progress;
drop policy if exists student_topic_progress_update_own on public.student_topic_progress;
drop policy if exists student_topic_progress_delete_own on public.student_topic_progress;

create policy syllabus_subjects_select_authenticated
on public.syllabus_subjects
for select
to authenticated
using (true);

create policy syllabus_topics_select_authenticated
on public.syllabus_topics
for select
to authenticated
using (true);

create policy student_topic_progress_select_own
on public.student_topic_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy student_topic_progress_insert_own
on public.student_topic_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy student_topic_progress_update_own
on public.student_topic_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy student_topic_progress_delete_own
on public.student_topic_progress
for delete
to authenticated
using (auth.uid() = user_id);

grant select on public.syllabus_subjects to authenticated;
grant select on public.syllabus_topics to authenticated;
grant all on public.student_topic_progress to authenticated;
grant all on public.syllabus_subjects to service_role;
grant all on public.syllabus_topics to service_role;
grant all on public.student_topic_progress to service_role;

create or replace function public.set_student_topic_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_student_topic_progress_updated_at on public.student_topic_progress;
create trigger trg_student_topic_progress_updated_at
before update on public.student_topic_progress
for each row
execute function public.set_student_topic_progress_updated_at();
