import bcrypt from 'bcrypt';
import type { RequestHandler } from 'express';

import config from '../config/env.js';

import {
  ADMIN_COOKIE_NAME,
  createAdminToken,
} from '../services/auth.service.js';

export const loginAdmin: RequestHandler = async (
  req,
  res,
) => {
  const { username, password } = req.body;

  if (
    typeof username !== 'string' ||
    typeof password !== 'string'
  ) {
    res.status(400).json({
      message:
        'Username and password are required',
    });

    return;
  }

  if (username !== config.ADMIN_USERNAME) {
    res.status(401).json({
      message: 'Invalid credentials',
    });

    return;
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      config.ADMIN_PASSWORD_HASH,
    );

  if (!passwordMatches) {
    res.status(401).json({
      message: 'Invalid credentials',
    });

    return;
  }

  const token = createAdminToken(
    config.ADMIN_USERNAME,
  );

  res.cookie(
    ADMIN_COOKIE_NAME,
    token,
    {
      httpOnly: true,
      secure:
        config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: config.JWT_EXPIRE_SECONDS * 1000,
      path: '/',
    },
  );

  res.json({
    user: {
      username: config.ADMIN_USERNAME,
      role: 'admin',
    },
  });
};