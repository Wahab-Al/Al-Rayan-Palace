
import type { RequestHandler } from 'express';

import config from '../config/env.js';
import { registerUploadLease, releaseUploadLease } from '../utils/uploadLease.js';

const CAPACITY_ERROR_MESSAGE =
  'Upload capacity is temporarily unavailable. Please retry shortly.';

export function createUploadConcurrencyLimiter(
  maxConcurrent: number,
): RequestHandler {
  if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new RangeError(
      'Upload concurrency must be a positive integer',
    );
  }

  let activeUploads = 0;

  return (req, res, next) => {
    if (activeUploads >= maxConcurrent) {
      res.setHeader('Retry-After', '1');

      res.status(503).json({
        message: CAPACITY_ERROR_MESSAGE,
      });

      return;
    }

    activeUploads++;

    registerUploadLease(req, () => {
      activeUploads--;
    });

    // Normal completion is a fallback release path.
    // Premature response close is intentionally NOT a release path:
    // async validation or Cloudinary processing may still be running.
    res.once('finish', () => {
      releaseUploadLease(req);
    });

    next();
  };
}

export const uploadConcurrency = createUploadConcurrencyLimiter(
  config.UPLOAD_MAX_CONCURRENT,
);
