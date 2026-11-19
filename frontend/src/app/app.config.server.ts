import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { APP_CONFIG } from './core/config/app-config';
import { environment } from '../environments/environment';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: APP_CONFIG,
      useValue: {
        apiBaseUrl: process.env['API_ORIGIN']
          ? `${process.env['API_ORIGIN'].replace(/\/$/, '')}/api`
          : environment.apiUrl,
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
