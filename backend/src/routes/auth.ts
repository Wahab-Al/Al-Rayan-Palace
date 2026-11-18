import { Router } from 'express';
import bcrypt from 'bcrypt';

import config from '../config/env.js';

import { ADMIN_COOKIE_NAME, createAdminToken } from '../services/auth.service.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        message: 'Username and password are required',
      });

      return;
    }

    if (username !== config.ADMIN_USERNAME) {
      res.status(401).json({
        message: 'Invalid credentials',
      });

      return;
    }

    const passwordMatches = await bcrypt.compare(password, config.ADMIN_PASSWORD_HASH);

    if (!passwordMatches) {
      res.status(401).json({
        message: 'Invalid credentials',
      });

      return;
    }

    const token = createAdminToken(config.ADMIN_USERNAME);

    // res.cookie(
    //   ADMIN_COOKIE_NAME,
    //   token,
    //   {
    //     httpOnly: true,
    //     secure:
    //       config.NODE_ENV === 'production',
    //     sameSite: 'lax',
    //     maxAge: config.JWT_EXPIRE_SECONDS * 1000,
    //     path: '/',
    //   },
    // );
    res.cookie(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,

      secure: config.NODE_ENV === 'production',

      sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',

      maxAge: config.JWT_EXPIRE_SECONDS * 1000,

      path: '/',
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
});

router.post('/logout', (_req, res) => {
  // res.clearCookie(
  //   ADMIN_COOKIE_NAME,
  //   {
  //     httpOnly: true,
  //     secure:
  //       config.NODE_ENV === 'production',
  //     sameSite: 'lax',
  //     path: '/',
  //   },
  // );
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,

    secure: config.NODE_ENV === 'production',

    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',

    path: '/',
  });

  res.json({
    message: 'Logged out',
  });
});

export default router;
