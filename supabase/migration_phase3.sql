-- ============================================================
-- IntelliBoard — Migração Fase 3: Timer Pomodoro
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── Tabela: pomodoro_sessions ────────────────────────────────
create table if not exists public.pomodoro_sessions (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  task_id          uuid not null references public.tasks(id) on delete cascade,
  duration_minutes integer not null,
  started_at       timestamptz not null,
  finished_at      timestamptz not null,
  completed        boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists pomodoro_sessions_user_idx    on public.pomodoro_sessions (user_id);
create index if not exists pomodoro_sessions_task_idx    on public.pomodoro_sessions (task_id);
create index if not exists pomodoro_sessions_date_idx    on public.pomodoro_sessions (user_id, started_at desc);

alter table public.pomodoro_sessions enable row level security;

drop policy if exists "pomodoro: leitura própria"     on public.pomodoro_sessions;
drop policy if exists "pomodoro: inserção própria"    on public.pomodoro_sessions;
drop policy if exists "pomodoro: exclusão própria"    on public.pomodoro_sessions;

create policy "pomodoro: leitura própria"
  on public.pomodoro_sessions for select using (auth.uid() = user_id);
create policy "pomodoro: inserção própria"
  on public.pomodoro_sessions for insert with check (auth.uid() = user_id);
create policy "pomodoro: exclusão própria"
  on public.pomodoro_sessions for delete using (auth.uid() = user_id);

-- ── Tabela: user_settings ─────────────────────────────────────
create table if not exists public.user_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  focus_duration  integer not null default 25 check (focus_duration in (25, 50)),
  short_break     integer not null default 5  check (short_break  in (5, 10)),
  long_break      integer not null default 15 check (long_break   in (15, 30)),
  sound_enabled   boolean not null default true,
  updated_at      timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "settings: leitura própria"     on public.user_settings;
drop policy if exists "settings: escrita própria"     on public.user_settings;

create policy "settings: leitura própria"
  on public.user_settings for select using (auth.uid() = user_id);
create policy "settings: escrita própria"
  on public.user_settings for all using (auth.uid() = user_id);
