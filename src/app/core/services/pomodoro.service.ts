import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Task } from '../models/task.model';
import { PomodoroPhase, TimerStatus, UserSettings } from '../models/pomodoro.model';

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private supabase = inject(SupabaseService);

  // ── Estado público ───────────────────────────────────────────
  readonly activeTask   = signal<Task | null>(null);
  readonly phase        = signal<PomodoroPhase | null>(null);
  readonly timerStatus  = signal<TimerStatus>('done');
  readonly remaining    = signal(0);
  readonly phaseDuration = signal(0);
  readonly sessionsThisCycle = signal(0);

  readonly isActive   = computed(() => this.phase() !== null);
  readonly isRunning  = computed(() => this.timerStatus() === 'running');
  readonly isPaused   = computed(() => this.timerStatus() === 'paused');
  readonly isDone     = computed(() => this.timerStatus() === 'done');
  readonly isFocus    = computed(() => this.phase() === 'focus');
  readonly isBreak    = computed(() => this.phase() === 'short_break' || this.phase() === 'long_break');
  readonly progress   = computed(() => {
    const total = this.phaseDuration();
    return total > 0 ? this.remaining() / total : 0;
  });

  // ── Privado ──────────────────────────────────────────────────
  private worker: Worker | null = null;
  private sessionStart: Date | null = null;
  private currentFocusDuration = 0;
  private notificationsGranted = false;

  constructor() {
    this.initWorker();
  }

  // ── Controles públicos ───────────────────────────────────────

  async startFocus(task: Task, settings: UserSettings): Promise<void> {
    if (this.isActive()) {
      this.sendToWorker({ type: 'STOP' });
      if (this.isFocus() && this.timerStatus() !== 'done') {
        await this.saveSession(false);
      }
    }
    await this.requestNotificationPermission();

    const seconds = settings.focus_duration * 60;
    this.currentFocusDuration = seconds;
    this.sessionStart = new Date();

    this.activeTask.set(task);
    this.phase.set('focus');
    this.phaseDuration.set(seconds);
    this.remaining.set(seconds);
    this.timerStatus.set('running');

    this.sendToWorker({ type: 'START', seconds });
  }

  startBreak(settings: UserSettings): void {
    const isLong = this.sessionsThisCycle() > 0 && this.sessionsThisCycle() % 4 === 0;
    const phase: PomodoroPhase = isLong ? 'long_break' : 'short_break';
    const seconds = (isLong ? settings.long_break : settings.short_break) * 60;

    this.phase.set(phase);
    this.phaseDuration.set(seconds);
    this.remaining.set(seconds);
    this.timerStatus.set('running');
    this.sessionStart = new Date();

    this.sendToWorker({ type: 'START', seconds });
  }

  continueNextFocus(settings: UserSettings): void {
    const task = this.activeTask();
    if (!task) return;
    void this.startFocus(task, settings);
  }

  pause(): void {
    this.sendToWorker({ type: 'PAUSE' });
    this.timerStatus.set('paused');
  }

  resume(): void {
    this.sendToWorker({ type: 'RESUME' });
    this.timerStatus.set('running');
  }

  async abandon(): Promise<void> {
    this.sendToWorker({ type: 'STOP' });
    if (this.isFocus() && this.timerStatus() !== 'done') {
      await this.saveSession(false);
    }
    this.reset();
  }

  setSoundEnabled(enabled: boolean, settings: UserSettings): void {
    void this.settingsRef?.update({ sound_enabled: enabled });
    void settings;
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ── Privados ─────────────────────────────────────────────────

  private settingsRef: { update: (p: Partial<UserSettings>) => Promise<void> } | null = null;

  /** Injetado externamente para evitar dependência circular */
  registerSettingsRef(ref: { update: (p: Partial<UserSettings>) => Promise<void> }): void {
    this.settingsRef = ref;
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(
        new URL('../workers/timer.worker', import.meta.url),
        { type: 'module' }
      );
      this.worker.addEventListener('message', ({ data }) => {
        if (data.type === 'TICK') {
          this.remaining.set(data.remaining);
        } else if (data.type === 'DONE') {
          void this.onPhaseDone();
        }
      });
    } catch {
      console.warn('[Pomodoro] Web Worker indisponível — usando fallback de intervalo.');
      this.initFallbackInterval();
    }
  }

  private fallbackInterval: ReturnType<typeof setInterval> | null = null;

  private initFallbackInterval(): void {
    // Polyfill minimal: será ativado apenas se o worker falhar
    this.worker = {
      postMessage: (msg: { type: string; seconds?: number }) => {
        if (msg.type === 'START') {
          this.fallbackInterval && clearInterval(this.fallbackInterval);
          let rem = msg.seconds ?? 0;
          this.fallbackInterval = setInterval(() => {
            rem--;
            if (rem <= 0) {
              clearInterval(this.fallbackInterval!);
              this.remaining.set(0);
              void this.onPhaseDone();
            } else {
              this.remaining.set(rem);
            }
          }, 1000);
        } else if (msg.type === 'PAUSE' || msg.type === 'STOP') {
          clearInterval(this.fallbackInterval!);
        } else if (msg.type === 'RESUME') {
          // re-post START with remaining
          this.worker!.postMessage({ type: 'START', seconds: this.remaining() });
        }
      },
      addEventListener: () => {},
      terminate: () => {},
    } as unknown as Worker;
  }

  private async onPhaseDone(): Promise<void> {
    if (this.isFocus()) {
      await this.saveSession(true);
      this.sessionsThisCycle.update(n => n + 1);
      this.notify('🎯 Sessão concluída!', 'Ótimo trabalho! Hora de descansar.');
      this.playChime();
      // Manter phase='focus' e status='done' — widget mostra botão "Iniciar pausa"
      const nextPhase: PomodoroPhase =
        this.sessionsThisCycle() % 4 === 0 ? 'long_break' : 'short_break';
      this.phase.set(nextPhase);
      this.timerStatus.set('done');
      this.remaining.set(0);
    } else {
      this.notify('⏰ Pausa encerrada!', 'Pronto para mais um foco?');
      this.playChime();
      this.phase.set('focus');
      this.timerStatus.set('done');
      this.remaining.set(0);
    }
  }

  private async saveSession(completed: boolean): Promise<void> {
    const task = this.activeTask();
    if (!task || !this.sessionStart) return;
    const user = await this.supabase.getUser();
    if (!user) return;

    await this.supabase.supabase.from('pomodoro_sessions').insert({
      user_id: user.id,
      task_id: task.id,
      duration_minutes: Math.round(this.currentFocusDuration / 60),
      started_at: this.sessionStart.toISOString(),
      finished_at: new Date().toISOString(),
      completed,
    });

    this.sessionStart = null;
  }

  private reset(): void {
    this.activeTask.set(null);
    this.phase.set(null);
    this.phaseDuration.set(0);
    this.remaining.set(0);
    this.timerStatus.set('done');
    this.sessionStart = null;
    this.currentFocusDuration = 0;
  }

  private sendToWorker(msg: object): void {
    this.worker?.postMessage(msg);
  }

  private async requestNotificationPermission(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      this.notificationsGranted = result === 'granted';
    } else {
      this.notificationsGranted = Notification.permission === 'granted';
    }
  }

  private notify(title: string, body: string): void {
    if (this.notificationsGranted && 'Notification' in window) {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }

  private playChime(): void {
    try {
      const ctx = new AudioContext();
      // Acorde C-E-G sutil
      ([523.25, 659.25, 783.99] as number[]).forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.16;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc.start(t);
        osc.stop(t + 0.9);
      });
    } catch { /* Audio não disponível */ }
  }
}
