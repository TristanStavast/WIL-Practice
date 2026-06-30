import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <form class="card auth-card" (ngSubmit)="submit()">
        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-sub">Sign in to your DevBoard account.</p>

        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }

        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" class="input"
                 [(ngModel)]="email" required autocomplete="email" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" class="input"
                 [(ngModel)]="password" required autocomplete="current-password" />
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%"
                [disabled]="loading()">
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>

        <p class="auth-foot">
          No account? <a routerLink="/register">Create one</a>
        </p>
      </form>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);
  //comment

  submit(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => this.router.navigate(['/projects']),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          err.error?.error?.message ?? 'Unable to sign in. Please try again.',
        );
      },
    });
  }
}
