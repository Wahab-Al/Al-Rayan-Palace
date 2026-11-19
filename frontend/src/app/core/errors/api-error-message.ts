import { HttpErrorResponse } from '@angular/common/http';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body: unknown = error.error;
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = body.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if (error.status === 0) {
    return 'Unable to connect to the service. Check your connection and try again.';
  }

  return fallback;
}
