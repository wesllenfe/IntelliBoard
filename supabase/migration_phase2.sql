-- ============================================================
-- IntelliBoard — Migração Fase 2: IA nas tarefas
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── Adicionar colunas de IA ──────────────────────────────────
alter table public.tasks
  add column if not exists subtasks              jsonb     default '[]'::jsonb,
  add column if not exists ai_suggestion_original jsonb;

-- A coluna ai_suggestion_accepted já existe da Fase 1.
-- Garantir que exista caso o schema seja aplicado do zero:
alter table public.tasks
  add column if not exists ai_suggestion_accepted boolean;

-- ── Comentários descritivos ──────────────────────────────────
comment on column public.tasks.subtasks               is 'Array de {text: string, done: boolean} — subtarefas geradas ou criadas pelo usuário';
comment on column public.tasks.ai_suggestion_accepted is 'true = aceitou sugestão da IA sem editar; false = editou; null = não usou IA';
comment on column public.tasks.ai_suggestion_original is 'JSON original retornado pelo Groq — preservado para análise de precisão da IA';

-- ── Índice para queries de métricas (Fase 4) ─────────────────
create index if not exists tasks_ai_accepted_idx
  on public.tasks (user_id, ai_suggestion_accepted)
  where ai_suggestion_accepted is not null;
