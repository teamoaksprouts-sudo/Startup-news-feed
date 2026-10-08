-- Run this once in Supabase: Project → SQL Editor → New Query → paste all → Run

-- Table: articles (auto-filled by the scheduled RSS fetcher)
create table articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  link text not null unique,
  source text not null,
  summary text,
  image_url text,
  published_at timestamptz not null,
  created_at timestamptz default now()
);

-- Table: likes (one row per visitor per article)
create table likes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz default now(),
  unique (article_id, visitor_id)
);

-- Table: comments
create table comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  visitor_id text not null,
  display_name text not null,
  body text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table articles enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;

-- Anyone can READ articles, likes, comments
create policy "public read articles" on articles for select using (true);
create policy "public read likes" on likes for select using (true);
create policy "public read comments" on comments for select using (true);

-- Anyone can LIKE / UNLIKE (insert/delete their own like row)
create policy "public insert likes" on likes for insert with check (true);
create policy "public delete own like" on likes for delete using (true);

-- Anyone can post a comment (kept open for simplicity; add moderation later)
create policy "public insert comments" on comments for insert with check (
  char_length(body) > 0 and char_length(body) < 1000
  and char_length(display_name) > 0 and char_length(display_name) < 60
);

-- NOTE: articles are only inserted by the scheduled function using the
-- service_role key, which bypasses RLS — so no insert policy is needed for it.
