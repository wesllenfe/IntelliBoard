# IntelliBoard

## Projeto

App de gerenciamento de tarefas com Kanban e IA integrada.
IA sugere prioridade, categoria, descrição e subtarefas ao criar uma tarefa.
Timer Pomodoro vinculado a cada tarefa com histórico de sessões.
Dashboard de métricas reais + insights de produtividade e procrastinação.

## Tech Stack

- Framework: Angular 21 (standalone components + Signals)
- Drag and drop: Angular CDK
- Backend: Supabase (auth + banco com RLS)
- IA: Groq API com Llama 3.1
- Estilo: SCSS com variáveis CSS
- Deploy: Vercel

## Estrutura de rotas

- /auth → login e cadastro
- /board → kanban principal
- /dashboard → métricas e insights

## Convenções

- Standalone components, zero NgModules
- Signals para estado local e global
- Serviços isolados para Supabase e Groq
- NUNCA expor chaves de API fora do environment.ts
- Commits em português
- SCSS com variáveis CSS para todas as cores

## Regras de negócio importantes

- Ordem das colunas e tarefas deve ser persistida no banco
- Toda tarefa tem deadline desde a criação
- Registrar se o usuário aceitou ou editou sugestão da IA
- Pomodoro sempre vinculado a uma tarefa específica
- Sessões Pomodoro salvas individualmente no banco

## Fase atual

FASE 1 — Kanban base: auth + board com drag and drop persistido + CRUD de tarefas com deadline
