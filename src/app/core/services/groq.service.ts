import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AiSuggestion, Priority } from '../models/task.model';
import { DashboardMetrics, DayStats, ProcrastinatedTask, AiStats } from '../models/dashboard.model';

export interface InsightInput {
  metrics: DashboardMetrics;
  chartData: DayStats[];
  procrastinated: ProcrastinatedTask[];
  aiStats: AiStats;
}

const VALID_PRIORITIES: Priority[] = ['baixa', 'media', 'alta'];

const SYSTEM_PROMPT = `Você é um assistente de produtividade especializado em análise e planejamento de tarefas.

Analise o título da tarefa e retorne APENAS um objeto JSON válido, sem texto adicional, markdown ou explicações.

Formato exato da resposta:
{
  "prioridade": "baixa" | "media" | "alta",
  "categoria": "categoria em português (ex: desenvolvimento, design, reunião, documentação, pesquisa, marketing, infraestrutura, pessoal, financeiro)",
  "descricao": "1 a 3 frases descrevendo o que fazer, por que é importante e como abordar",
  "subtarefas": ["passo concreto 1", "passo concreto 2", "passo concreto 3"]
}

Regras:
- prioridade: avalie pela urgência e impacto implícitos no título
- categoria: seja específico e em português
- descricao: acionável e contextualizada
- subtarefas: mínimo 2, máximo 5 passos concretos e mensuráveis
- Responda SOMENTE com o JSON`;

interface GroqResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

@Injectable({ providedIn: 'root' })
export class GroqService {
  private http = inject(HttpClient);

  private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly model = 'llama-3.1-8b-instant';

  async analyzeTask(title: string): Promise<AiSuggestion> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.groqKey}`,
      'Content-Type': 'application/json',
    });

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Título da tarefa: "${title}"` },
      ],
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    };

    const response = await firstValueFrom(
      this.http.post<GroqResponse>(this.endpoint, body, { headers })
    );

    const content = response.choices[0]?.message?.content ?? '{}';
    return this.parseSuggestion(content);
  }

  async generateInsight(input: InsightInput): Promise<string> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${environment.groqKey}`,
      'Content-Type': 'application/json',
    });

    const bestDay = [...input.chartData]
      .sort((a, b) => (b.tasksCompleted * 20 + b.focusMinutes) - (a.tasksCompleted * 20 + a.focusMinutes))[0];

    const procList = input.procrastinated.slice(0, 3)
      .map(t => `"${t.title}" (${t.daysStuck} dias parada)`)
      .join(', ') || 'nenhuma';

    const overloaded = input.metrics.inProgressCount > 3;
    const aiRateText = input.aiStats.acceptanceRate >= 0
      ? `${Math.round(input.aiStats.acceptanceRate * 100)}% de aceitação das sugestões da IA`
      : 'sem uso da IA ainda';

    const userContext = `
Dados do usuário esta semana:
- Taxa de conclusão: ${Math.round(input.metrics.completionRate * 100)}% (${input.metrics.weekTasksDone} de ${input.metrics.weekTasksCreated} tarefas)
- Tempo total de foco: ${input.metrics.totalFocusMinutes} minutos
- Sequência de dias produtivos: ${input.metrics.currentStreak} dias
- Tarefas atrasadas: ${input.metrics.overdueCount}
- Em andamento simultâneo: ${input.metrics.inProgressCount} tarefas${overloaded ? ' ⚠️ SOBRECARGA' : ''}
- Dia mais produtivo: ${bestDay?.label ?? 'sem dados'} (${bestDay?.tasksCompleted ?? 0} tarefas, ${bestDay?.focusMinutes ?? 0}min de foco)
- Tarefas procrastinadas há mais de 7 dias: ${procList}
- IA: ${aiRateText}
`.trim();

    const systemPrompt = `Você é um coach de produtividade direto, empático e prático.
Analise os dados do usuário e gere um insight semanal personalizado em português.
Escreva 3 a 5 frases curtas. Seja específico, não genérico.
Mencione o melhor dia, padrões de procrastinação e uma sugestão prática concreta.
${overloaded ? 'IMPORTANTE: o usuário está em sobrecarga com múltiplas tarefas em andamento — mencione isso com empatia.' : ''}
Se houver poucos dados, seja encorajador e sugira como começar.
Responda em texto puro, sem markdown, sem bullet points.`;

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContext },
      ],
      temperature: 0.7,
      max_tokens: 300,
    };

    const response = await firstValueFrom(
      this.http.post<GroqResponse>(this.endpoint, body, { headers })
    );

    return response.choices[0]?.message?.content?.trim() ?? '';
  }

  private parseSuggestion(raw: string): AiSuggestion {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      prioridade: VALID_PRIORITIES.includes(parsed.prioridade) ? parsed.prioridade : 'media',
      categoria: typeof parsed.categoria === 'string' ? parsed.categoria.trim() : '',
      descricao: typeof parsed.descricao === 'string' ? parsed.descricao.trim() : '',
      subtarefas: Array.isArray(parsed.subtarefas)
        ? parsed.subtarefas
            .filter((s: unknown) => typeof s === 'string')
            .slice(0, 5)
        : [],
    };
  }
}
