
import type {
  CookieOptions,
  RequestHandler,
} from 'express';

import config from '../config/env.js';

import {
  ADMIN_COOKIE_NAME,
  createAdminToken,
  verifyAdminCredentials,
} from '../services/auth.service.js';

export interface AuthControllerDependencies {
  verifyAdminCredentials: typeof verifyAdminCredentials;
  createAdminToken: typeof createAdminToken;
}

/**
 * Returns consistent cookie options for login and logout.
 * Keeping these options identical is important for cookie clearing.
 */
function getAdminCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };
}

/**
 * Creates authentication handlers.
 *
 * Dependencies are injectable so controllers can be tested
 * without using real credentials or exposing secrets.
 */
export function createAuthController(
  dependencies: AuthControllerDependencies = {
    verifyAdminCredentials,
    createAdminToken,
  },
) {
  const loginAdmin: RequestHandler = async (req, res) => {
    try {
      const body: unknown = req.body;

      if (
        typeof body !== 'object' ||
        body === null ||
        Array.isArray(body)
      ) {
        res.status(400).json({
          message: 'Username and password are required',
        });
        return;
      }

      const { username, password } = body as {
        username?: unknown;
        password?: unknown;
      };

      if (
        typeof username !== 'string' ||
        typeof password !== 'string'
      ) {
        res.status(400).json({
          message: 'Username and password are required',
        });
        return;
      }

      const credentialsValid =
        await dependencies.verifyAdminCredentials(username, password);

      if (!credentialsValid) {
        res.status(401).json({
          message: 'Invalid credentials',
        });
        return;
      }

      const token = dependencies.createAdminToken(username);

      res.cookie(ADMIN_COOKIE_NAME, token, {
        ...getAdminCookieOptions(),
        maxAge: config.JWT_EXPIRE_SECONDS * 1000,
      });

      res.status(200).json({
        user: {
          username: config.ADMIN_USERNAME,
          role: 'admin',
        },
      });
    } catch (error) {
      console.error('Admin login error:', error);

      res.status(500).json({
        message: 'Server error',
      });
    }
  };

  const logoutAdmin: RequestHandler = (_req, res) => {
    res.clearCookie(
      ADMIN_COOKIE_NAME,
      getAdminCookieOptions(),
    );

    res.status(200).json({
      message: 'Logged out',
    });
  };

  return {
    loginAdmin,
    logoutAdmin,
  };
}

const authController = createAuthController();

export const loginAdmin = authController.loginAdmin;
export const logoutAdmin = authController.logoutAdmin;
