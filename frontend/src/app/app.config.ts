import { ApplicationConfig, PLATFORM_ID, inject, provideAppInitializer } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, firstValueFrom, of } from 'rxjs';

import { provideRouter } from '@angular/router';

import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideClientHydration(),
    provideAppInitializer(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

      return firstValueFrom(
        inject(AuthService)
          .logout()
          .pipe(catchError(() => of(null))),
      );
    }),
  ],
};
