import { Component, inject, output } from '@angular/core';
import { UserSettingsService } from '../../../../core/services/user-settings.service';
import { UserSettings } from '../../../../core/models/pomodoro.model';

@Component({
  selector: 'app-pomodoro-settings',
  templateUrl: './pomodoro-settings.component.html',
  styleUrl: './pomodoro-settings.component.scss',
})
export class PomodoroSettingsComponent {
  private settingsSvc = inject(UserSettingsService);

  readonly settings = this.settingsSvc.settings;
  readonly closed = output<void>();

  async set<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<void> {
    await this.settingsSvc.update({ [key]: value });
  }

  async setNumber(key: 'focus_duration' | 'short_break' | 'long_break', raw: string): Promise<void> {
    const min = key === 'short_break' ? 1 : 5;
    const max = key === 'focus_duration' ? 120 : key === 'short_break' ? 60 : 120;
    const value = Math.min(max, Math.max(min, parseInt(raw, 10) || min));
    await this.settingsSvc.update({ [key]: value });
  }
}
