
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import config from '../config/env.js';

export const ADMIN_COOKIE_NAME = 'alrayan_admin_token';

const JWT_ALGORITHM = 'HS256' as const;

export interface AdminTokenPayload {
  sub: string;
  role: 'admin';
}

/**
 * Verifies admin credentials.
 *
 * Always performs the password comparison before checking
 * the username to reduce username-based timing differences.
 */
export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const passwordMatches = await bcrypt.compare(
    password,
    config.ADMIN_PASSWORD_HASH,
  );

  return username === config.ADMIN_USERNAME && passwordMatches;
}

/**
 * Creates a signed admin JWT.
 */
export function createAdminToken(username: string): string {
  if (username !== config.ADMIN_USERNAME) {
    throw new Error('Invalid admin identity');
  }

  return jwt.sign(
    {
      role: 'admin',
    },
    config.JWT_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      subject: username,
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
      expiresIn: config.JWT_EXPIRE_SECONDS,
    },
  );
}

/**
 * Verifies an admin JWT and validates its required claims.
 */
export function verifyAdminToken(token: string): AdminTokenPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
  });

  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload');
  }

  if (
    typeof decoded.sub !== 'string' ||
    decoded.sub !== config.ADMIN_USERNAME ||
    decoded.role !== 'admin'
  ) {
    throw new Error('Invalid admin identity or role');
  }

  if (
    typeof decoded.exp !== 'number' ||
    !Number.isSafeInteger(decoded.exp) ||
    typeof decoded.iat !== 'number' ||
    !Number.isSafeInteger(decoded.iat)
  ) {
    throw new Error('Required JWT time claims are missing or invalid');
  }

  if (
    decoded.exp <= decoded.iat ||
    decoded.exp - decoded.iat > config.JWT_EXPIRE_SECONDS
  ) {
    throw new Error('Invalid token lifetime');
  }

  if (
    decoded.iss !== config.JWT_ISSUER ||
    decoded.aud !== config.JWT_AUDIENCE
  ) {
    throw new Error('Invalid token issuer or audience');
  }

  return {
    sub: decoded.sub,
    role: 'admin',
  };
}
