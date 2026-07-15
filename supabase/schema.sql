-- 咖啡杯測評分應用 — Supabase schema
-- Run this whole file once in your Supabase project's SQL editor (Database > SQL Editor).
-- No user accounts: identity is just a typed display name + a random per-browser
-- client_id stored in localStorage. RLS below is intentionally permissive (anyone
-- with the anon key can read/write) since this is a casual coffee-club app with
-- no login. Tighten it if you ever expose this beyond a trusted group.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Activities (e.g. "咖啡社杯測") — shared list, cross-room, cross-session.
-- ---------------------------------------------------------------------------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into activities (name) values ('咖啡社杯測')
  on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Rooms
-- ---------------------------------------------------------------------------
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  mode text not null check (mode in ('blind', 'open')),
  activity_id uuid references activities(id),
  activity_name text not null,
  subtitle text not null default '',
  session_date timestamptz,
  stage text not null default 'waiting' check (stage in ('waiting', 'scoring', 'locked', 'reveal')),
  scoring_started_at timestamptz,
  answer_confirmed boolean not null default false,
  host_name text not null,
  archived_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Beans in a room's cupping sheet ("豆單")
-- idx        = display/entry order (1-based), stable identifier for a bean row
-- sample_idx = physical pour/serving slot (0-based). For 'open' mode this is
--              assigned immediately (= idx - 1). For 'blind' mode it stays
--              null until the host explicitly sets the answer key (host may
--              not know the physical pour order until after cupping starts).
-- ---------------------------------------------------------------------------
create table if not exists room_beans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  idx int not null,
  sample_idx int,
  name text not null,
  origin text not null default '',
  process text not null default '',
  variety text not null default '',
  roaster text not null default '',
  unique (room_id, idx)
);

create index if not exists room_beans_room_id_idx on room_beans (room_id);

-- ---------------------------------------------------------------------------
-- Participants (one row per person per room; identified by a random client_id
-- persisted in that browser's localStorage, plus a typed display name)
-- ---------------------------------------------------------------------------
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  client_id text not null,
  name text not null,
  role text not null check (role in ('host', 'participant')),
  joined_at timestamptz not null default now(),
  submitted_at timestamptz,
  guess_submitted_at timestamptz,
  unique (room_id, client_id)
);

create index if not exists participants_room_id_idx on participants (room_id);

-- ---------------------------------------------------------------------------
-- Score entries — one row per participant per sample. score_mode is chosen
-- per participant per sample (each cupper can pick 專業/簡易 for themselves).
-- ---------------------------------------------------------------------------
create table if not exists score_entries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  sample_idx int not null,
  score_mode text not null default 'pro' check (score_mode in ('pro', 'easy')),
  clean numeric(5,2) not null default 6,
  sweet numeric(5,2) not null default 6,
  acid numeric(5,2) not null default 6,
  mouth numeric(5,2) not null default 6,
  flavor numeric(5,2) not null default 6,
  after numeric(5,2) not null default 6,
  balance numeric(5,2) not null default 6,
  overall numeric(5,2) not null default 6,
  def_int numeric(4,1) not null default 0,
  easy_score numeric(6,2) not null default 80,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (participant_id, sample_idx)
);

create index if not exists score_entries_room_id_idx on score_entries (room_id);

-- ---------------------------------------------------------------------------
-- Guess entries (blind mode) — candidates picked while scoring, plus the
-- final locked-in guess made on the guess screen. bean_idx values reference
-- room_beans.idx (not the uuid) to match the prototype's simple integer refs.
-- ---------------------------------------------------------------------------
create table if not exists guess_entries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  sample_idx int not null,
  candidates int[] not null default '{}',
  final_guess int,
  unique (participant_id, sample_idx)
);

create index if not exists guess_entries_room_id_idx on guess_entries (room_id);

-- ---------------------------------------------------------------------------
-- Cross-session comparison bars ("歷史比較") per activity.
-- ---------------------------------------------------------------------------
create table if not exists history_sessions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id),
  activity_name text not null,
  subtitle text not null default '',
  session_date date,
  avg_score numeric(6,2) not null,
  beans text[] not null default '{}',
  -- blind mode only: { "participant name": correctGuessCount } for that session,
  -- so the cumulative blind leaderboard can sum real history instead of guessing.
  guess_tally jsonb not null default '{}'::jsonb,
  room_id uuid references rooms(id),
  created_at timestamptz not null default now()
);

create index if not exists history_sessions_activity_idx on history_sessions (activity_name);

-- ---------------------------------------------------------------------------
-- Personal cupping bean history ("杯測豆歷史資料庫") — auto-appended for every
-- participant when a room's results are revealed; filtered client-side by name.
-- ---------------------------------------------------------------------------
create table if not exists bean_history (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  bean_name text not null,
  sub text not null default '',
  my_score numeric(6,2) not null,
  session_label text not null,
  session_date date,
  room_id uuid references rooms(id),
  created_at timestamptz not null default now()
);

create index if not exists bean_history_participant_idx on bean_history (participant_name);

-- ---------------------------------------------------------------------------
-- Bean catalog ("豆單資料庫") — shared, cross-room list of beans people have
-- cupped before. Grows automatically whenever a host creates a room (each
-- valid bean is upserted by name), and can also be curated directly (add/
-- remove) from the "從豆單資料庫選擇" sheet.
-- ---------------------------------------------------------------------------
create table if not exists bean_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  origin text not null default '',
  process text not null default '',
  variety text not null default '',
  roaster text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists bean_catalog_name_idx on bean_catalog (name);

-- ---------------------------------------------------------------------------
-- Row Level Security — permissive (no auth in this app; anyone with the
-- publishable anon key can read/write). See note at top of file.
-- ---------------------------------------------------------------------------
alter table activities enable row level security;
alter table rooms enable row level security;
alter table room_beans enable row level security;
alter table participants enable row level security;
alter table score_entries enable row level security;
alter table guess_entries enable row level security;
alter table history_sessions enable row level security;
alter table bean_history enable row level security;
alter table bean_catalog enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['activities','rooms','room_beans','participants','score_entries','guess_entries','history_sessions','bean_history','bean_catalog']
  loop
    execute format('drop policy if exists "public_all_%1$s" on %1$s', t);
    execute format(
      'create policy "public_all_%1$s" on %1$s for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Table-level grants — newer Supabase projects revoke default anon/
-- authenticated privileges on the public schema, which makes every write
-- fail with 42501 (insufficient_privilege) even though the RLS policies
-- above allow it. Re-running this is harmless.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime — broadcast row changes so every device in a room stays in sync.
-- Loop makes this safe to re-run (won't error if a table is already added).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['rooms','room_beans','participants','score_entries','guess_entries','history_sessions','bean_history']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
