import { Injectable, inject, signal } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable, tap } from 'rxjs';

import { APP_CONFIG } from '../config/app-config';

export interface AuthUser {
  username: string;
  role: 'admin';
}

interface LoginResponse {
  user: AuthUser;
}

interface MeResponse {
  authenticated: boolean;
  admin: {
    sub: string;
    role: 'admin';
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${inject(APP_CONFIG).apiBaseUrl}/auth`;

  readonly user = signal<AuthUser | null>(null);

  readonly isAuthenticated = signal(false);

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/login`,
        {
          username,
          password,
        },
        {
          withCredentials: true,
        },
      )
      .pipe(
        tap((response) => {
          this.user.set(response.user);
          this.isAuthenticated.set(true);
        }),
      );
  }

  me(): Observable<MeResponse> {
    return this.http
      .get<MeResponse>(`${this.apiUrl}/me`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.isAuthenticated.set(response.authenticated);

          this.user.set({
            username: response.admin.sub,
            role: response.admin.role,
          });
        }),
      );
  }

  logout(): Observable<unknown> {
    return this.http
      .post(
        `${this.apiUrl}/logout`,
        {},
        {
          withCredentials: true,
        },
      )
      .pipe(
        tap(() => {
          this.clearSession();
        }),
      );
  }

  clearSession(): void {
    this.user.set(null);
    this.isAuthenticated.set(false);
  }
}
