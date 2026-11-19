import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { APP_CONFIG } from '../config/app-config';

export interface AuthUser {
  username: string;
  role: 'admin';
}

export interface LoginResponse {
  user: AuthUser;
}

export interface MeResponse {
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

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { username, password },
      { withCredentials: true },
    );
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiUrl}/me`, { withCredentials: true });
  }

  logout(): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true });
  }
}
