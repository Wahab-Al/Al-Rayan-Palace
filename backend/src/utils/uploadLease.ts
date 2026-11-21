
import type { Request } from 'express';

const uploadLeases = new WeakMap<Request, () => void>();

/**
 * Registers the release operation for one upload request.
 */
export function registerUploadLease(
  req: Request,
  release: () => void,
): void {
  uploadLeases.set(req, release);
}

/**
 * Releases an upload slot exactly once.
 * Safe to call from multiple lifecycle paths.
 */
export function releaseUploadLease(req: Request): void {
  const release = uploadLeases.get(req);

  if (!release) {
    return;
  }

  // Remove before invoking to guarantee idempotency.
  uploadLeases.delete(req);
  release();
}
