import { Component, inject, computed, input } from '@angular/core';
import { PomodoroService } from '../../../../core/services/pomodoro.service';
import { UserSettingsService } from '../../../../core/services/user-settings.service';
import { PHASE_LABELS } from '../../../../core/models/pomodoro.model';

@Component({
  selector: 'app-pomodoro-timer',
  templateUrl: './pomodoro-timer.component.html',
  styleUrl: './pomodoro-timer.component.scss',
})
export class PomodoroTimerComponent {
  readonly pomodoro = inject(PomodoroService);
  private settingsSvc = inject(UserSettingsService);

  readonly settings = this.settingsSvc.settings;

  // SVG ring
  readonly RADIUS = 54;
  readonly CIRCUMFERENCE = 2 * Math.PI * this.RADIUS; // ≈ 339.29

  readonly dashOffset = computed(() =>
    this.CIRCUMFERENCE * (1 - this.pomodoro.progress())
  );

  readonly phaseLabel = computed(() => {
    const p = this.pomodoro.phase();
    return p ? PHASE_LABELS[p] : '';
  });

  readonly sessionDots = computed(() => {
    const total = 4;
    const done = this.pomodoro.sessionsThisCycle() % 4;
    return Array.from({ length: total }, (_, i) => i < done);
  });

  readonly timeDisplay = computed(() =>
    this.pomodoro.formatTime(this.pomodoro.remaining())
  );

  readonly ringColor = computed(() => {
    const phase = this.pomodoro.phase();
    if (phase === 'focus') return '#60a5fa';
    if (phase === 'short_break') return '#4ade80';
    return '#94a3b8';
  });

  pause()    { this.pomodoro.pause(); }
  resume()   { this.pomodoro.resume(); }
  abandon()  { void this.pomodoro.abandon(); }
  startBreak()      { this.pomodoro.startBreak(this.settings()); }
  startNextFocus()  { this.pomodoro.continueNextFocus(this.settings()); }
}
