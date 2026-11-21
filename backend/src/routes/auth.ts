
import { Router, type RequestHandler } from 'express';

import {
  loginAdmin,
  logoutAdmin,
} from '../controller/auth.controller.js';

export interface AuthRouteHandlers {
  loginAdmin: RequestHandler;
  logoutAdmin: RequestHandler;
}

/**
 * Creates the authentication router.
 *
 * Default handlers are the real application controllers.
 * Alternative handlers can be injected for integration tests.
 */
export function createAuthRouter(
  handlers: AuthRouteHandlers = {
    loginAdmin,
    logoutAdmin,
  },
) {
  const router = Router();

  router.post('/login', handlers.loginAdmin);
  router.post('/logout', handlers.logoutAdmin);

  return router;
}

const router = createAuthRouter();

export default router;
