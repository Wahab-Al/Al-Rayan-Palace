import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export const ADMIN_COOKIE_NAME = 'alrayan_admin_token';

export interface AdminTokenPayload {
  sub: string;
  role: 'admin';
}

export function createAdminToken(username: string): string {
  return jwt.sign(
    {
      sub: username,
      role: 'admin',
    },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRE_SECONDS,
    },
  );
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET);

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }

  if (typeof decoded.sub !== 'string' || decoded.role !== 'admin') {
    throw new Error('Invalid admin token');
  }

  return {
    sub: decoded.sub,
    role: 'admin',
  };
}
