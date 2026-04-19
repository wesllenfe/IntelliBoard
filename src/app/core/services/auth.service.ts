import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  private _user = signal<User | null>(null);
  private _loading = signal(true);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());

  constructor() {
    // Restore session from localStorage on startup (fixes F5 logout)
    this.supabase.supabase.auth.getSession().then(({ data }) => {
      this._user.set(data.session?.user ?? null);
      this._loading.set(false);
    });

    // React to future auth changes (login, logout, token refresh)
    this.supabase.onAuthStateChange((_, session) => {
      this._user.set(session?.user ?? null);
    });
  }

  async signUp(email: string, password: string) {
    const { error } = await this.supabase.signUp(email, password);
    if (error) throw error;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.supabase.signIn(email, password);
    if (error) throw error;
    await this.router.navigate(['/board']);
  }

  async signOut() {
    await this.supabase.signOut();
    await this.router.navigate(['/auth']);
  }
}
