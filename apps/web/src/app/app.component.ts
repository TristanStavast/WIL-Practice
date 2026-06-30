import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    @if (auth.isAuthenticated()) {
      <header class="topbar">
        <a routerLink="/projects" class="brand">
          <span class="brand-mark">◆</span> DevBoard
        </a>
        <div class="topbar-right">
          <span class="who">{{ auth.user()?.name }}</span>
          <button class="btn btn-ghost" (click)="logout()">Sign out</button>
        </div>
      </header>
    }
    <main class="content"><router-outlet /></main>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
