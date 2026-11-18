import type { AdminTokenPayload } from '../services/auth.service.js';

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export {};
