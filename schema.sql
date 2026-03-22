-- Pulse Database Schema
-- Run this in your Supabase SQL editor to set up the required tables.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Users table
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  username    text not null unique,
  email       text not null unique,
  password_hash text not null,
  created_at  timestamptz not null default now()
);

-- Index for fast login lookups
create index if not exists users_email_idx on users (email);

-- Daily check-ins table
create table if not exists checkins (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references users(id) on delete cascade,
  checkin_date          date not null default current_date,
  sleep                 smallint not null check (sleep between 1 and 10),
  mood                  smallint not null check (mood between 1 and 10),
  productive            boolean not null,
  productive_description text,
  money                 numeric(10, 2) not null default 0,
  win                   text not null,
  score                 smallint not null check (score between 0 and 100),
  insight               text not null,
  created_at            timestamptz not null default now(),

  -- One check-in per user per day
  unique (user_id, checkin_date)
);

-- Indexes for common queries
create index if not exists checkins_user_id_idx  on checkins (user_id);
create index if not exists checkins_date_score_idx on checkins (checkin_date, score desc);

-- Row Level Security (optional but recommended for Supabase)
-- The backend uses the service role key which bypasses RLS,
-- but enabling RLS prevents accidental direct access from anon keys.
alter table users    enable row level security;
alter table checkins enable row level security;

-- Service role has full access (used by the backend)
create policy "service role full access" on users
  for all to service_role using (true) with check (true);

create policy "service role full access" on checkins
  for all to service_role using (true) with check (true);

-- Push notification token (added for Expo push notifications)
-- Run this separately if you already applied the schema above:
--   alter table users add column if not exists push_token text;
alter table users add column if not exists push_token text;

-- ---------------------------------------------------------------------------
-- Leaderboard views (computed from checkins — no separate leaderboard table)
-- ---------------------------------------------------------------------------

-- Daily leaderboard: top scores for a given date (default today)
-- Usage: SELECT * FROM leaderboard_daily WHERE checkin_date = current_date ORDER BY rank;
create or replace view leaderboard_daily as
select
  row_number() over (partition by checkin_date order by score desc) as rank,
  c.checkin_date,
  u.username,
  c.score
from checkins c
join users u on u.id = c.user_id;

-- All-time leaderboard: users ranked by average score across all check-ins
-- Usage: SELECT * FROM leaderboard_alltime ORDER BY rank LIMIT 20;
create or replace view leaderboard_alltime as
select
  row_number() over (order by avg_score desc, total_checkins desc) as rank,
  u.username,
  round(avg(c.score))::int as avg_score,
  count(*)::int                as total_checkins
from checkins c
join users u on u.id = c.user_id
group by u.id, u.username;
