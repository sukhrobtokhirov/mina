-- Run this in the Supabase SQL editor (or via supabase db push).
-- Private notes: each row belongs to one auth user. Anon has no access.

create table if not exists public.notes (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  preview text not null default '',
  tag text not null default 'journal'
    check (tag in ('journal', 'work', 'life')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

create index if not exists notes_user_deleted_idx
  on public.notes (user_id, deleted_at);

alter table public.notes enable row level security;
alter table public.notes force row level security;

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_own"
  on public.notes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notes_insert_own"
  on public.notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "notes_update_own"
  on public.notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own"
  on public.notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.notes from anon, public;
grant select, insert, update, delete on table public.notes to authenticated;

alter table public.notes replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;
end $$;
