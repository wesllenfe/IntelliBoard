import { Component, inject, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  providers: [DashboardService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected readonly Math = Math;
  private auth = inject(AuthService);
  readonly svc  = inject(DashboardService);

  readonly loading = this.svc.loading;
  readonly data    = this.svc.data;

  readonly maxBarScore = computed(() => {
    const stats = this.data().chartData;
    return Math.max(1, ...stats.map(d => d.tasksCompleted * 20 + d.focusMinutes));
  });

  barHeight(score: number): number {
    return Math.max(4, Math.round((score / this.maxBarScore()) * 100));
  }

  barScore(d: { tasksCompleted: number; focusMinutes: number }): number {
    return d.tasksCompleted * 20 + d.focusMinutes;
  }

  formatFocus(min: number): string {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  formatRate(rate: number): string {
    return `${Math.round(rate * 100)}%`;
  }

  signOut() { this.auth.signOut(); }

  async ngOnInit() {
    await this.svc.load();
  }
}
