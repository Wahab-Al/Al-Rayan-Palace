import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('owns the login workflow and updates the authenticated user', () => {
    store.login({ username: 'admin', password: 'secret' });

    const request = http.expectOne('http://localhost:5000/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'admin', password: 'secret' });
    request.flush({ user: { username: 'admin', role: 'admin' } });

    expect(store.loginStatus()).toBe('success');
    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()).toEqual({ username: 'admin', role: 'admin' });
  });

  it('normalizes a rejected login into Store error state', () => {
    store.login({ username: 'admin', password: 'wrong' });

    http
      .expectOne('http://localhost:5000/api/auth/login')
      .flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(store.loginStatus()).toBe('error');
    expect(store.loginError()).toBe('Invalid credentials');
    expect(store.isAuthenticated()).toBe(false);
  });

  it('validates the cookie session and clears it when the API rejects it', async () => {
    const validation = firstValueFrom(store.validateSession());
    http.expectOne('http://localhost:5000/api/auth/me').flush({
      authenticated: true,
      admin: { sub: 'admin', role: 'admin' },
    });

    await expect(validation).resolves.toBe(true);
    expect(store.user()).toEqual({ username: 'admin', role: 'admin' });

    const rejectedValidation = firstValueFrom(store.validateSession());
    http
      .expectOne('http://localhost:5000/api/auth/me')
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    await expect(rejectedValidation).resolves.toBe(false);
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });
});
