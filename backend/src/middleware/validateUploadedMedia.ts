import type { RequestHandler } from 'express';
import { fileTypeFromBuffer } from 'file-type';

import { allowedMimeTypes } from './uploadMedia.js';
import { releaseUploadLease } from '../utils/uploadLease.js';

const MAX_DETECTION_BUFFER_SIZE = 1024 * 1024;

export async function isValidUploadedMedia(
  file: Pick<Express.Multer.File, 'buffer' | 'mimetype'>,
): Promise<boolean> {
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return false;
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    return false;
  }

  try {
    const detected = await fileTypeFromBuffer(file.buffer, {
      maxBufferSize: MAX_DETECTION_BUFFER_SIZE,
    });

    if (!detected) {
      return false;
    }

    return (
      allowedMimeTypes.has(detected.mime) &&
      detected.mime === file.mimetype
    );
  } catch {
    return false;
  }
}

export const validateUploadedMedia: RequestHandler = async (
  req,
  res,
  next,
) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  for (const file of files) {
    const valid = await isValidUploadedMedia(file);

    if (!valid) {
      releaseUploadLease(req);

      res.status(400).json({
        message: 'Unsupported or invalid media content',
      });
      return;
    }
  }

  next();
};