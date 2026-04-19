-- ============================================================
-- IntelliBoard — Schema completo (Fase 1)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Tabela: tasks ────────────────────────────────────────────
create table if not exists public.tasks (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  title                   text not null,
  description             text,
  priority                text not null default 'media'
                            check (priority in ('baixa', 'media', 'alta')),
  category                text,
  deadline                date not null,
  status                  text not null default 'todo'
                            check (status in ('todo', 'in_progress', 'done')),
  position                integer not null default 0,
  ai_suggestion_accepted  boolean,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── Índices ──────────────────────────────────────────────────
create index if not exists tasks_user_id_idx  on public.tasks (user_id);
create index if not exists tasks_status_idx   on public.tasks (user_id, status, position);

-- ── updated_at automático ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ── Row Level Security ───────────────────────────────────────
alter table public.tasks enable row level security;

drop policy if exists "tasks: leitura própria"  on public.tasks;
drop policy if exists "tasks: inserção própria"  on public.tasks;
drop policy if exists "tasks: atualização própria" on public.tasks;
drop policy if exists "tasks: exclusão própria"  on public.tasks;

create policy "tasks: leitura própria"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks: inserção própria"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks: atualização própria"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "tasks: exclusão própria"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- ── Realtime (opcional) ──────────────────────────────────────
-- alter publication supabase_realtime add table public.tasks;
