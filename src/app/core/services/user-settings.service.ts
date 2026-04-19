import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserSettings, DEFAULT_SETTINGS } from '../models/pomodoro.model';

@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private supabase = inject(SupabaseService);

  private _settings = signal<UserSettings>({ ...DEFAULT_SETTINGS });
  readonly settings = this._settings.asReadonly();

  async load(): Promise<void> {
    const user = await this.supabase.getUser();
    if (!user) return;

    const { data } = await this.supabase.supabase
      .from('user_settings')
      .select('focus_duration, short_break, long_break, sound_enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      this._settings.set({
        focus_duration: data.focus_duration,
        short_break: data.short_break,
        long_break: data.long_break,
        sound_enabled: data.sound_enabled,
      });
    }
  }

  async update(patch: Partial<UserSettings>): Promise<void> {
    const next = { ...this._settings(), ...patch } as UserSettings;
    this._settings.set(next);

    const user = await this.supabase.getUser();
    if (!user) return;

    await this.supabase.supabase
      .from('user_settings')
      .upsert(
        { user_id: user.id, ...next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  }
}
