
import multer from 'multer';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Angular sends five text fields and up to three media files.
const MAX_TEXT_FIELDS = 5;
const MAX_FIELD_SIZE = 8 * 1024;
const MAX_FIELD_NAME_SIZE = 32;
const MAX_MULTIPART_PARTS = 8;

export const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export const uploadMedia = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3,

    // Limit non-file fields sent through FormData.
    fields: MAX_TEXT_FIELDS,

    // Maximum size of each text field, measured in bytes.
    fieldSize: MAX_FIELD_SIZE,

    // All current Angular field names are shorter than 32 bytes.
    fieldNameSize: MAX_FIELD_NAME_SIZE,

    // Five text fields plus three files.
    parts: MAX_MULTIPART_PARTS,
  },

  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error('Unsupported media type'));
      return;
    }

    callback(null, true);
  },
});
