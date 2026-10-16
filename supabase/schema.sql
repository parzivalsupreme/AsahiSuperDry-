-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run. Create your account first (Authentication → Users → Add user)
-- so existing entries get assigned to it.

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Untitled',
  day date not null default current_date,
  time text,
  tags text[] not null default '{}',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrades from earlier versions of this schema.
alter table public.entries add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table public.entries drop column if exists mood;
update public.entries set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;

create index if not exists entries_user_day_idx on public.entries (user_id, day desc);

-- Keep updated_at current on every edit.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- Only the signed-in owner can read or change entries. Anonymous visitors get nothing.
alter table public.entries enable row level security;

drop policy if exists "Public access" on public.entries;
drop policy if exists "Owner access" on public.entries;
create policy "Owner access" on public.entries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Photos: a private bucket. Each user can only touch files in their own folder (<user id>/...).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "Own photos" on storage.objects;
create policy "Own photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Place and weather stamped when an entry is written (both optional).
alter table public.entries add column if not exists place text;
alter table public.entries add column if not exists weather text;

-- Habits ticked off with each entry.
alter table public.entries add column if not exists habits text[] not null default '{}';

-- Work page: tasks and notes, kept as one Markdown file per account.
create table if not exists public.work (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists work_set_updated_at on public.work;
create trigger work_set_updated_at
  before update on public.work
  for each row execute function public.set_updated_at();

alter table public.work enable row level security;

drop policy if exists "Owner access" on public.work;
create policy "Owner access" on public.work
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
