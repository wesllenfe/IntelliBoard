# IntelliBoard

Kanban board com IA integrada, timer Pomodoro por tarefa e dashboard de produtividade.

![Angular](https://img.shields.io/badge/Angular-21-dd0031?logo=angular&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ecf8e?logo=supabase&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama%203.1-f55036?logo=meta&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)

## Funcionalidades

**Kanban inteligente**
- Três colunas: A fazer / Em andamento / Concluído
- Drag & drop com ordem persistida no banco de dados
- CRUD completo com deadline obrigatório por tarefa

**IA por tarefa (Groq + Llama 3.1)**
- Ao digitar o título, a IA sugere prioridade, categoria, descrição e subtarefas
- Rastreia se o usuário aceitou ou editou a sugestão
- Subtarefas com checklist e progresso visual

**Timer Pomodoro**
- Sessão de foco vinculada a uma tarefa específica
- Ciclo completo: foco → pausa curta → pausa longa (a cada 4 sessões)
- Tempos configuráveis por usuário (salvos no banco)
- Timer roda em Web Worker — não sofre throttling ao minimizar a aba
- Notificação do browser e chime de áudio ao concluir
- Histórico de sessões salvo individualmente

**Dashboard de métricas**
- Taxa de conclusão da semana
- Tempo total de foco acumulado
- Sequência produtiva (streak de dias com Pomodoro)
- Tarefas atrasadas
- Gráfico dos últimos 7 dias (tarefas + foco por dia)
- Detecção de sobrecarga (mais de 3 tarefas em andamento simultâneo)
- Lista de procrastinação (tarefas paradas há mais de 7 dias)
- Insight semanal gerado pela IA com base nas métricas reais

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Angular 21 (standalone components + Signals) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| IA | Groq API — `llama-3.1-8b-instant` |
| Drag & Drop | Angular CDK |
| Estilo | SCSS com variáveis CSS (sem biblioteca de UI) |
| Timer | Web Worker |
| Deploy | Vercel |

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Chave de API no [Groq](https://console.groq.com)

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/wesllenfe/IntelliBoard.git
cd IntelliBoard

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp src/environments/environment.example.ts src/environments/environment.ts
# Edite environment.ts com suas chaves (veja a seção abaixo)

# 4. Execute as migrations no Supabase (SQL Editor)
# supabase/schema.sql
# supabase/migration_phase2.sql
# supabase/migration_phase3.sql

# 5. Inicie o servidor de desenvolvimento
npm start
```

## Variáveis de ambiente

Edite `src/environments/environment.ts` com seus dados:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://SEU_PROJETO.supabase.co',
  supabaseAnonKey: 'sua_anon_key',
  groqKey: 'sua_groq_key',
};
```

> **Atenção:** `environment.ts` está no `.gitignore` e nunca deve ser commitado.

## Banco de dados

As migrations estão na pasta `supabase/`. Execute na ordem no SQL Editor do Supabase:

1. `schema.sql` — tabela `tasks` com RLS
2. `migration_phase2.sql` — subtarefas e rastreamento de IA
3. `migration_phase3.sql` — `pomodoro_sessions` e `user_settings`

## Estrutura do projeto

```
src/
├── app/
│   ├── core/
│   │   ├── guards/          # authGuard, publicGuard
│   │   ├── models/          # interfaces TypeScript
│   │   ├── services/        # Supabase, Auth, Task, Pomodoro, Groq
│   │   └── workers/         # timer.worker.ts (Web Worker)
│   └── features/
│       ├── auth/            # Login e cadastro
│       ├── board/           # Kanban + componentes (card, form, pomodoro)
│       └── dashboard/       # Métricas e insights
└── environments/
    ├── environment.ts        # ← não commitado (.gitignore)
    └── environment.example.ts
```

## Deploy (Vercel)

1. Conecte o repositório no [Vercel](https://vercel.com)
2. O build command padrão (`npm run build`) funciona sem configuração adicional
3. As chaves de API ficam apenas no `environment.ts` local — para produção, crie um `environment.prod.ts` com as chaves de produção (também no `.gitignore`)

## Licença

MIT
