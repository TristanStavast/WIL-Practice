import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-wrap">
      <form class="card auth-card" (ngSubmit)="submit()">
        <h1 class="auth-title">Create your account</h1>
        <p class="auth-sub">Start tracking work on DevBoard.</p>

        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }

        <div class="field">
          <label for="name">Name</label>
          <input id="name" name="name" class="input" [(ngModel)]="name"
                 required autocomplete="name" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" class="input"
                 [(ngModel)]="email" required autocomplete="email" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" class="input"
                 [(ngModel)]="password" required minlength="10"
                 autocomplete="new-password" />
          <small class="muted">At least 10 characters.</small>
        </div>

        <button type="submit" class="btn btn-primary" style="width:100%"
                [disabled]="loading()">
          {{ loading() ? 'Creating…' : 'Create account' }}
        </button>

        <p class="auth-foot">
          Already have an account? <a routerLink="/login">Sign in</a>
        </p>
      </form>
    </div>
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (this.loading()) return;
    if (this.password.length < 10) {
      this.error.set('Password must be at least 10 characters.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth
      .register(this.email.trim(), this.name.trim(), this.password)
      .subscribe({
        next: () => this.router.navigate(['/projects']),
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(
            err.error?.error?.message ?? 'Unable to create account.',
          );
        },
      });
  }
}
