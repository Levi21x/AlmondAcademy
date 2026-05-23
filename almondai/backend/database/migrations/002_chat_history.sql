-- === RUN THIS SQL IN SUPABASE SQL EDITOR ===
-- 1) chat_sessions
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'New Conversation',
  subject text,
  mode text check (mode in ('mbbs', 'neet_pg')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message_at timestamptz default now()
);

-- 2) chat_messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- 3) indexes
create index if not exists idx_chat_sessions_user_id on public.chat_sessions(user_id);
create index if not exists idx_chat_sessions_user_last_message on public.chat_sessions(user_id, last_message_at desc);
create index if not exists idx_chat_messages_session_id on public.chat_messages(session_id);
create index if not exists idx_chat_messages_session_created on public.chat_messages(session_id, created_at asc);

-- 4) RLS
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists chat_sessions_select_own on public.chat_sessions;
drop policy if exists chat_sessions_insert_own on public.chat_sessions;
drop policy if exists chat_sessions_update_own on public.chat_sessions;

create policy chat_sessions_select_own
on public.chat_sessions
for select
using (auth.uid() = user_id);

create policy chat_sessions_insert_own
on public.chat_sessions
for insert
with check (auth.uid() = user_id);

create policy chat_sessions_update_own
on public.chat_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists chat_messages_select_own on public.chat_messages;
drop policy if exists chat_messages_insert_own on public.chat_messages;
drop policy if exists chat_messages_update_own on public.chat_messages;

create policy chat_messages_select_own
on public.chat_messages
for select
using (auth.uid() = user_id);

create policy chat_messages_insert_own
on public.chat_messages
for insert
with check (auth.uid() = user_id);

create policy chat_messages_update_own
on public.chat_messages
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 5) keep updated_at fresh on chat_sessions updates
create or replace function public.set_chat_sessions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_chat_sessions_updated_at on public.chat_sessions;
create trigger trg_chat_sessions_updated_at
before update on public.chat_sessions
for each row
execute function public.set_chat_sessions_updated_at();
