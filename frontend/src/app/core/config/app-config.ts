// import { environment } from '../../../environments/environment.production';
import { environment } from '../../../environments/environment';
export const APP_CONFIG = {
  apiBaseUrl: environment.apiUrl,
} as const;
