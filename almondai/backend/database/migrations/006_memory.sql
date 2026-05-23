-- === RUN THIS SQL IN SUPABASE SQL EDITOR ===

create table if not exists public.student_memory_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  summary_type text not null check (summary_type in ('weekly', 'subject', 'overall')),
  subject text,
  content text not null,
  weak_topics text[] default '{}',
  strong_topics text[] default '{}',
  study_patterns jsonb default '{}'::jsonb,
  week_start date,
  generated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.student_struggle_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  subject text,
  mention_count integer default 1,
  last_mentioned_at timestamptz default now(),
  first_mentioned_at timestamptz default now(),
  is_resolved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, topic)
);

create index if not exists idx_student_memory_summaries_user on public.student_memory_summaries(user_id);
create index if not exists idx_student_memory_summaries_user_type on public.student_memory_summaries(user_id, summary_type);
create index if not exists idx_student_memory_summaries_user_generated on public.student_memory_summaries(user_id, generated_at desc);
create index if not exists idx_student_struggle_patterns_user on public.student_struggle_patterns(user_id);
create index if not exists idx_student_struggle_patterns_user_count on public.student_struggle_patterns(user_id, mention_count desc);
create index if not exists idx_student_struggle_patterns_user_resolved on public.student_struggle_patterns(user_id, is_resolved);

alter table public.student_memory_summaries enable row level security;
alter table public.student_struggle_patterns enable row level security;

drop policy if exists student_memory_summaries_select_own on public.student_memory_summaries;
drop policy if exists student_memory_summaries_insert_own on public.student_memory_summaries;
drop policy if exists student_memory_summaries_update_own on public.student_memory_summaries;
drop policy if exists student_memory_summaries_delete_own on public.student_memory_summaries;

drop policy if exists student_struggle_patterns_select_own on public.student_struggle_patterns;
drop policy if exists student_struggle_patterns_insert_own on public.student_struggle_patterns;
drop policy if exists student_struggle_patterns_update_own on public.student_struggle_patterns;
drop policy if exists student_struggle_patterns_delete_own on public.student_struggle_patterns;

create policy student_memory_summaries_select_own
on public.student_memory_summaries
for select
to authenticated
using (auth.uid() = user_id);

create policy student_memory_summaries_insert_own
on public.student_memory_summaries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy student_memory_summaries_update_own
on public.student_memory_summaries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy student_memory_summaries_delete_own
on public.student_memory_summaries
for delete
to authenticated
using (auth.uid() = user_id);

create policy student_struggle_patterns_select_own
on public.student_struggle_patterns
for select
to authenticated
using (auth.uid() = user_id);

create policy student_struggle_patterns_insert_own
on public.student_struggle_patterns
for insert
to authenticated
with check (auth.uid() = user_id);

create policy student_struggle_patterns_update_own
on public.student_struggle_patterns
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy student_struggle_patterns_delete_own
on public.student_struggle_patterns
for delete
to authenticated
using (auth.uid() = user_id);

grant all on public.student_memory_summaries to authenticated;
grant all on public.student_struggle_patterns to authenticated;
grant all on public.student_memory_summaries to service_role;
grant all on public.student_struggle_patterns to service_role;

create or replace function public.set_student_struggle_patterns_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_student_struggle_patterns_updated_at on public.student_struggle_patterns;
create trigger trg_student_struggle_patterns_updated_at
before update on public.student_struggle_patterns
for each row
execute function public.set_student_struggle_patterns_updated_at();
