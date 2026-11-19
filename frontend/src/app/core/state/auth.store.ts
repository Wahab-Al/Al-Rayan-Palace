import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Observable, catchError, exhaustMap, map, of, pipe, tap } from 'rxjs';

import { getApiErrorMessage } from '../errors/api-error-message';
import { AuthService, type AuthUser } from '../services/auth';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginStatus: 'idle' | 'pending' | 'success' | 'error';
  loginError: string | null;
}

interface Credentials {
  username: string;
  password: string;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loginStatus: 'idle',
  loginError: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, authService = inject(AuthService)) => ({
    login: rxMethod<Credentials>(
      pipe(
        exhaustMap(({ username, password }) => {
          patchState(store, { loginStatus: 'pending', loginError: null });
          return authService.login(username, password).pipe(
            tap(({ user }) =>
              patchState(store, {
                user,
                isAuthenticated: true,
                loginStatus: 'success',
              }),
            ),
            catchError((error: unknown) => {
              patchState(store, {
                loginStatus: 'error',
                loginError: getApiErrorMessage(error, 'Invalid username or password.'),
              });
              return EMPTY;
            }),
          );
        }),
      ),
    ),
    validateSession(): Observable<boolean> {
      return authService.me().pipe(
        tap((response) =>
          patchState(store, {
            isAuthenticated: response.authenticated,
            user: response.authenticated
              ? { username: response.admin.sub, role: response.admin.role }
              : null,
          }),
        ),
        map((response) => response.authenticated),
        // A failed session check is an unauthenticated session, not a page crash.
        catchError(() => {
          patchState(store, { isAuthenticated: false, user: null });
          return of(false);
        }),
      );
    },
    logout(): Observable<void> {
      return authService.logout().pipe(
        map(() => undefined),
        tap(() => patchState(store, { user: null, isAuthenticated: false })),
        // Always clear the local session even if the server cookie was already expired.
        catchError(() => {
          patchState(store, { user: null, isAuthenticated: false });
          return of(undefined);
        }),
      );
    },
    clearSession(): void {
      patchState(store, { user: null, isAuthenticated: false });
    },
    resetLoginStatus(): void {
      patchState(store, { loginStatus: 'idle', loginError: null });
    },
  })),
);
