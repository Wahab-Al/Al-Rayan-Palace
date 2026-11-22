
import type { RequestHandler } from 'express';

import config from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Use the existing frontend origin as the only trusted browser origin.
const TRUSTED_ORIGIN = new URL(config.FRONTEND_ORIGIN).origin;

/**
 * Extracts the origin from an Origin or Referer header.
 * Returns null for missing, malformed, or opaque origins.
 */
function extractOrigin(value: string | undefined): string | null {
  if (!value || value.toLowerCase() === 'null') {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export const requireTrustedOrigin: RequestHandler = (
  req,
  res,
  next,
) => {
  const method = req.method.toUpperCase();

  // Safe HTTP methods must never modify application state.
  if (SAFE_METHODS.has(method)) {
    next();
    return;
  }

  const originHeader = req.get('origin');
  const refererHeader = req.get('referer');

  // Prefer Origin. Use Referer only when Origin is absent.
  const sourceHeader =
    originHeader !== undefined ? originHeader : refererHeader;

  const requestOrigin = extractOrigin(sourceHeader);

  if (!requestOrigin || requestOrigin !== TRUSTED_ORIGIN) {
    res.status(403).json({
      message: 'Forbidden request origin',
    });

    return;
  }

  next();
};
