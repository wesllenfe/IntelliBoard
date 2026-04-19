export type PomodoroPhase = 'focus' | 'short_break' | 'long_break';
export type TimerStatus = 'running' | 'paused' | 'done';

export interface PomodoroSession {
  id: string;
  user_id: string;
  task_id: string;
  duration_minutes: number;
  started_at: string;
  finished_at: string;
  completed: boolean;
}

export interface UserSettings {
  focus_duration: number;
  short_break: number;
  long_break: number;
  sound_enabled: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  focus_duration: 25,
  short_break: 5,
  long_break: 15,
  sound_enabled: true,
};

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  focus: 'Foco',
  short_break: 'Pausa curta',
  long_break: 'Pausa longa',
};
