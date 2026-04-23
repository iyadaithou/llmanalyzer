-- LLM Analyzer schema (single-user build)
-- No RLS: auth is handled at the app layer by the password middleware,
-- and the server hits Supabase with the service-role key.

create extension if not exists "pgcrypto";

-- ------------ FOLDERS ------------
create table if not exists public.folders (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  created_at   timestamptz not null default now()
);

-- ------------ SESSIONS ------------
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  folder_id     uuid references public.folders(id) on delete set null,
  name          text not null default 'Untitled session',
  multi_turn    boolean not null default true,
  system_prompt text,
  temperature   numeric(4,2) default 0.70,
  max_tokens    integer default 1024,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists sessions_created_idx on public.sessions(created_at desc);
create index if not exists sessions_folder_idx  on public.sessions(folder_id);

-- ------------ CHAT WINDOWS (one per model in a session) ------------
create table if not exists public.chat_windows (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  model        text not null,             -- openrouter model id, e.g. "openai/gpt-4o"
  label        text,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists chat_windows_session_idx on public.chat_windows(session_id, position);

-- ------------ PROMPTS (one prompt fans out to all windows) ------------
create table if not exists public.prompts (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  content      text not null,
  turn_index   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists prompts_session_idx on public.prompts(session_id, turn_index);

-- ------------ RESPONSES (one per window per prompt) ------------
create table if not exists public.responses (
  id              uuid primary key default gen_random_uuid(),
  prompt_id       uuid not null references public.prompts(id) on delete cascade,
  chat_window_id  uuid not null references public.chat_windows(id) on delete cascade,
  model           text not null,
  content         text,
  finish_reason   text,
  latency_ms      integer,
  tokens_in       integer,
  tokens_out      integer,
  cost_usd        numeric(12,6),
  error           text,
  rating          integer,   -- free-form 1-5 or null
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists responses_prompt_idx on public.responses(prompt_id);
create index if not exists responses_window_idx on public.responses(chat_window_id);
create unique index if not exists responses_prompt_window_uq
  on public.responses(prompt_id, chat_window_id);

-- ------------ updated_at trigger for sessions ------------
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sessions_touch on public.sessions;
create trigger sessions_touch
  before update on public.sessions
  for each row execute function public.tg_touch_updated_at();
