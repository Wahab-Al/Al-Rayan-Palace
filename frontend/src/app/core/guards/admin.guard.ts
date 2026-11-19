import { inject } from '@angular/core';

import { CanActivateFn, Router } from '@angular/router';

import { map } from 'rxjs';

import { AuthStore } from '../state/auth.store';

export const adminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);

  const router = inject(Router);

  return authStore
    .validateSession()
    .pipe(map((authenticated) => (authenticated ? true : router.parseUrl('/admin/login'))));
};
