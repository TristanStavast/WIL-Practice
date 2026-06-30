import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from './models';

interface AuthResponse {
  accessToken: string;
  user: User;
}

/**
 * Owns the client-side auth state. The access token lives only in memory (a
 * signal) — deliberately NOT in localStorage, so a malicious script can't read
 * it back out. The refresh token lives in an httpOnly cookie the JS never sees;
 * on a hard reload we silently re-establish the session from that cookie.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  get accessToken(): string | null {
    return this._accessToken();
  }

  register(email: string, name: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', { email, name, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap((res) => this.setSession(res)));
  }

  /** Used by the interceptor on a 401 and on app bootstrap. */
  refresh(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/refresh', {})
      .pipe(tap((res) => this.setSession(res)));
  }

  logout(): Observable<void> {
    this.clearSession();
    return this.http.post<void>('/api/auth/logout', {});
  }

  setSession(res: AuthResponse): void {
    this._accessToken.set(res.accessToken);
    this._user.set(res.user);
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._user.set(null);
  }
}
