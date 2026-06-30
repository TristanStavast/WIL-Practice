import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from './auth.service';

// Endpoints that must NOT trigger the refresh-retry dance (they ARE the auth
// flow). A 401 from these is a genuine failure to surface to the caller.
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

// Shared across concurrent requests so a burst of 401s triggers exactly one
// refresh; everyone else waits for its result.
let refreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

function withAuth(req: HttpRequest<unknown>, token: string | null) {
  // withCredentials ensures the httpOnly refresh cookie rides along.
  const headers = token
    ? req.headers.set('Authorization', `Bearer ${token}`)
    : req.headers;
  return req.clone({ headers, withCredentials: true });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));
  const authed = withAuth(req, isAuthCall ? null : auth.accessToken);

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthCall) {
        return throwError(() => err);
      }
      return handle401(req, next, auth, router);
    }),
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (refreshing) {
    // A refresh is already in flight — wait for it, then retry once.
    return refreshDone$.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => next(withAuth(req, token))),
    );
  }

  refreshing = true;
  refreshDone$.next(null);

  return auth.refresh().pipe(
    switchMap((res) => {
      refreshing = false;
      refreshDone$.next(res.accessToken);
      return next(withAuth(req, res.accessToken));
    }),
    catchError((err) => {
      refreshing = false;
      auth.clearSession();
      void router.navigate(['/login']);
      return throwError(() => err);
    }),
  );
}
