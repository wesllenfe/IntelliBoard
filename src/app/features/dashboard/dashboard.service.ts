import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { GroqService } from '../../core/services/groq.service';
import {
  DashboardData, DashboardMetrics, DayStats,
  ProcrastinatedTask, AiStats,
} from '../../core/models/dashboard.model';
import { Task } from '../../core/models/task.model';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

@Injectable()
export class DashboardService {
  private supabase = inject(SupabaseService);
  private groq     = inject(GroqService);

  readonly data = signal<DashboardData>({
    metrics: {
      completionRate: 0, totalFocusMinutes: 0, currentStreak: 0,
      overdueCount: 0, inProgressCount: 0, weekTasksCreated: 0, weekTasksDone: 0,
    },
    chartData: this.emptyChart(),
    procrastinated: [],
    aiStats: { totalWithAi: 0, acceptanceRate: -1 },
    insight: null,
    insightLoading: false,
    hasEnoughData: false,
  });

  readonly loading = signal(true);

  async load(): Promise<void> {
    this.loading.set(true);

    const since60 = new Date();
    since60.setDate(since60.getDate() - 60);

    const [tasksResult, sessionsResult] = await Promise.all([
      this.supabase.supabase.from('tasks').select('*'),
      this.supabase.supabase
        .from('pomodoro_sessions')
        .select('*')
        .gte('started_at', since60.toISOString()),
    ]);

    const tasks: Task[]    = (tasksResult.data ?? []) as Task[];
    const sessions: any[]  = sessionsResult.data ?? [];
    const completedSessions = sessions.filter(s => s.completed);

    const metrics      = this.computeMetrics(tasks, completedSessions);
    const chartData    = this.computeChart(tasks, completedSessions);
    const procrastinated = this.computeProcrastination(tasks);
    const aiStats      = this.computeAiStats(tasks);
    const hasEnoughData = tasks.length >= 3 || completedSessions.length >= 1;

    this.data.set({
      metrics, chartData, procrastinated, aiStats,
      insight: null, insightLoading: hasEnoughData, hasEnoughData,
    });
    this.loading.set(false);

    // Insight da IA em background
    if (hasEnoughData) {
      this.loadInsight({ metrics, chartData, procrastinated, aiStats });
    }
  }

  private async loadInsight(input: Parameters<GroqService['generateInsight']>[0]): Promise<void> {
    try {
      const insight = await this.groq.generateInsight(input);
      this.data.update(d => ({ ...d, insight, insightLoading: false }));
    } catch {
      this.data.update(d => ({
        ...d,
        insight: 'Não foi possível gerar o insight agora. Tente novamente mais tarde.',
        insightLoading: false,
      }));
    }
  }

  // ── Cálculos ─────────────────────────────────────────────────

  private computeMetrics(tasks: Task[], completedSessions: any[]): DashboardMetrics {
    const now   = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // domingo desta semana
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const weekTasks   = tasks.filter(t => t.created_at.slice(0, 10) >= weekStartStr);
    const weekDone    = weekTasks.filter(t => t.status === 'done');
    const weekCreated = weekTasks.length;

    const overdue = tasks.filter(t =>
      t.status !== 'done' && t.deadline < today
    );

    const inProgress = tasks.filter(t => t.status === 'in_progress');

    const thisWeekSessions = completedSessions.filter(s =>
      s.started_at.slice(0, 10) >= weekStartStr
    );
    const totalFocusMinutes = thisWeekSessions.reduce(
      (acc, s) => acc + (s.duration_minutes ?? 0), 0
    );

    // Streak: dias consecutivos com ao menos 1 sessão Pomodoro concluída
    const sessionDates = new Set(completedSessions.map(s => s.started_at.slice(0, 10)));
    const streak = this.computeStreak(sessionDates, today);

    return {
      completionRate: weekCreated > 0 ? weekDone.length / weekCreated : 0,
      totalFocusMinutes,
      currentStreak: streak,
      overdueCount: overdue.length,
      inProgressCount: inProgress.length,
      weekTasksCreated: weekCreated,
      weekTasksDone: weekDone.length,
    };
  }

  private computeStreak(sessionDates: Set<string>, today: string): number {
    let streak = 0;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const startOffset = sessionDates.has(today) ? 0 : sessionDates.has(yesterday) ? 1 : -1;
    if (startOffset === -1) return 0;

    for (let i = startOffset; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (sessionDates.has(d)) streak++;
      else break;
    }
    return streak;
  }

  private computeChart(tasks: Task[], completedSessions: any[]): DayStats[] {
    const days: DayStats[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      const tasksCompleted = tasks.filter(t =>
        t.status === 'done' && t.updated_at.slice(0, 10) === dateStr
      ).length;

      const focusMinutes = completedSessions
        .filter(s => s.started_at.slice(0, 10) === dateStr)
        .reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);

      const score = tasksCompleted * 20 + focusMinutes;
      const intensity: DayStats['intensity'] =
        score === 0 ? 0 :
        score < 30  ? 1 :
        score < 80  ? 2 : 3;

      days.push({
        date: dateStr,
        label: DAY_LABELS[d.getDay()],
        tasksCompleted,
        focusMinutes,
        intensity,
      });
    }

    return days;
  }

  private computeProcrastination(tasks: Task[]): ProcrastinatedTask[] {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();

    return tasks
      .filter(t =>
        (t.status === 'todo' || t.status === 'in_progress') &&
        t.updated_at < cutoff
      )
      .map(t => ({
        id: t.id,
        title: t.title,
        status: t.status as 'todo' | 'in_progress',
        category: t.category,
        priority: t.priority,
        daysStuck: Math.floor(
          (Date.now() - new Date(t.updated_at).getTime()) / 86400000
        ),
      }))
      .sort((a, b) => b.daysStuck - a.daysStuck);
  }

  private computeAiStats(tasks: Task[]): AiStats {
    const withAi = tasks.filter(t => t.ai_suggestion_accepted !== null);
    const accepted = withAi.filter(t => t.ai_suggestion_accepted === true).length;
    return {
      totalWithAi: withAi.length,
      acceptanceRate: withAi.length > 0 ? accepted / withAi.length : -1,
    };
  }

  private emptyChart(): DayStats[] {
    const days: DayStats[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push({
        date: d.toISOString().slice(0, 10),
        label: DAY_LABELS[d.getDay()],
        tasksCompleted: 0, focusMinutes: 0, intensity: 0,
      });
    }
    return days;
  }
}
