import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

type AuthMode = 'login' | 'cadastro';

@Component({
  selector: 'app-auth',
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  private auth = inject(AuthService);

  mode            = signal<AuthMode>('login');
  email           = signal('');
  password        = signal('');
  confirmPassword = signal('');
  loading         = signal(false);
  error           = signal<string | null>(null);
  success         = signal<string | null>(null);

  toggleMode() {
    this.mode.update(m => (m === 'login' ? 'cadastro' : 'login'));
    this.error.set(null);
    this.success.set(null);
    this.confirmPassword.set('');
  }

  async submit() {
    this.error.set(null);
    this.success.set(null);

    if (this.mode() === 'cadastro') {
      if (this.password() !== this.confirmPassword()) {
        this.error.set('As senhas não coincidem.');
        return;
      }
      if (this.password().length < 6) {
        this.error.set('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
    }

    this.loading.set(true);
    try {
      if (this.mode() === 'login') {
        await this.auth.signIn(this.email(), this.password());
      } else {
        await this.auth.signUp(this.email(), this.password());
        this.success.set('Conta criada com sucesso! Faça login para continuar.');
        this.mode.set('login');
        this.confirmPassword.set('');
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Erro ao autenticar.');
    } finally {
      this.loading.set(false);
    }
  }
}
