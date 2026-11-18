import { inject } from '@angular/core';

import { CanActivateFn, Router } from '@angular/router';

import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);

  const router = inject(Router);

  return authService.me().pipe(
    map((response) => (response.authenticated ? true : router.parseUrl('/admin/login'))),

    catchError(() => {
      authService.clearSession();

      return of(router.parseUrl('/admin/login'));
    }),
  );
};
