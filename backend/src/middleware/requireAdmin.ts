import type { RequestHandler } from 'express';

import {
  ADMIN_COOKIE_NAME,
  verifyAdminToken,
} from '../services/auth.service.js';

export const requireAdmin: RequestHandler = (
  req,
  res,
  next,
) => {
  const token =
    req.cookies?.[ADMIN_COOKIE_NAME];

  if (
    typeof token !== 'string' ||
    token.length === 0
  ) {
    res.status(401).json({
      message: 'Authentication required',
    });

    return;
  }

  try {
    const admin = verifyAdminToken(token);

    req.admin = admin;

    next();
  } catch {
    res.status(401).json({
      message:
        'Invalid or expired authentication',
    });
  }
};