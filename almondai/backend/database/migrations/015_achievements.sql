create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_key text not null,
  badge_name text not null,
  badge_tier text not null check (badge_tier in ('bronze', 'silver', 'gold', 'platinum')),
  description text,
  icon text,
  metadata jsonb not null default '{}'::jsonb,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

create index if not exists idx_user_achievements_user_id on public.user_achievements(user_id);
create index if not exists idx_user_achievements_unlocked_at on public.user_achievements(user_id, unlocked_at desc);
create index if not exists idx_user_achievements_badge_key on public.user_achievements(badge_key);

alter table public.user_achievements enable row level security;

drop policy if exists user_achievements_select_own on public.user_achievements;
create policy user_achievements_select_own
on public.user_achievements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_achievements_insert_own on public.user_achievements;
create policy user_achievements_insert_own
on public.user_achievements
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_achievements_update_own on public.user_achievements;
create policy user_achievements_update_own
on public.user_achievements
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_achievements_delete_own on public.user_achievements;
create policy user_achievements_delete_own
on public.user_achievements
for delete
to authenticated
using (auth.uid() = user_id);

grant all on public.user_achievements to authenticated;
grant all on public.user_achievements to service_role;

drop trigger if exists trg_user_achievements_updated_at on public.user_achievements;
create trigger trg_user_achievements_updated_at
before update on public.user_achievements
for each row
execute function public.set_updated_at();
