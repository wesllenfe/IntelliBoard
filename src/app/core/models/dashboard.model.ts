export interface DashboardMetrics {
  completionRate: number;       // 0–1 (semana atual)
  totalFocusMinutes: number;    // semana atual
  currentStreak: number;        // dias consecutivos com Pomodoro
  overdueCount: number;         // tarefas atrasadas não concluídas
  inProgressCount: number;      // para detecção de sobrecarga
  weekTasksCreated: number;
  weekTasksDone: number;
}

export interface DayStats {
  date: string;           // ISO yyyy-MM-dd
  label: string;          // 'Seg', 'Ter', ...
  tasksCompleted: number;
  focusMinutes: number;
  intensity: 0 | 1 | 2 | 3;  // 0=nenhum 1=baixo 2=médio 3=alto
}

export interface ProcrastinatedTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress';
  category: string | null;
  priority: 'baixa' | 'media' | 'alta';
  daysStuck: number;
}

export interface AiStats {
  totalWithAi: number;
  acceptanceRate: number;   // 0–1, ou -1 se sem dados
}

export interface DashboardData {
  metrics: DashboardMetrics;
  chartData: DayStats[];
  procrastinated: ProcrastinatedTask[];
  aiStats: AiStats;
  insight: string | null;
  insightLoading: boolean;
  hasEnoughData: boolean;
}
