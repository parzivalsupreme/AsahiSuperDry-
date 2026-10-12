-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  day date not null default current_date,
  time text,
  tags text[] not null default '{}',
  mood text,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entries_day_idx on public.entries (day desc);

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

-- No sign-in: the public anon key may read and write every entry.
-- WARNING: anyone who has your site URL (and therefore the anon key) can read, edit and delete entries.
alter table public.entries enable row level security;

drop policy if exists "Public access" on public.entries;
create policy "Public access" on public.entries
  for all to anon, authenticated
  using (true)
  with check (true);
