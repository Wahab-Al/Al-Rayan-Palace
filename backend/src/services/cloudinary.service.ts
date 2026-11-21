
import { Readable } from 'node:stream';

import { getCloudinary } from '../config/cloudinary.js';

export type CloudinaryResourceType = 'image' | 'video';

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: CloudinaryResourceType;
}

export interface CloudinaryMediaService {
  uploadMedia(
    buffer: Buffer,
    resourceType: CloudinaryResourceType,
  ): Promise<UploadResult>;

  deleteMedia(
    publicId: string,
    resourceType: CloudinaryResourceType,
  ): Promise<void>;
}

const PRODUCT_MEDIA_FOLDER = 'alrayan-palacee/products';

function isResourceType(value: unknown): value is CloudinaryResourceType {
  return value === 'image' || value === 'video';
}

/**
 * Validates the upload response received from Cloudinary.
 *
 * Only HTTPS delivery URLs and the requested resource type
 * are accepted.
 */
function validateUploadResult(
  result: unknown,
  expectedResourceType: CloudinaryResourceType,
): UploadResult {
  if (typeof result !== 'object' || result === null) {
    throw new Error('Invalid Cloudinary upload response');
  }

  const response = result as {
    public_id?: unknown;
    secure_url?: unknown;
    resource_type?: unknown;
  };

  if (
    typeof response.public_id !== 'string' ||
    response.public_id.trim().length === 0 ||
    typeof response.secure_url !== 'string' ||
    response.secure_url.trim().length === 0
  ) {
    throw new Error('Cloudinary upload response is missing required fields');
  }

  if (response.resource_type !== expectedResourceType) {
    throw new Error('Cloudinary returned an unexpected resource type');
  }

  let secureUrl: URL;

  try {
    secureUrl = new URL(response.secure_url);
  } catch {
    throw new Error('Cloudinary returned an invalid delivery URL');
  }

  if (
    secureUrl.protocol !== 'https:' ||
    !secureUrl.hostname ||
    secureUrl.username.length > 0 ||
    secureUrl.password.length > 0
  ) {
    throw new Error('Cloudinary returned an insecure delivery URL');
  }

  return {
    publicId: response.public_id,
    secureUrl: response.secure_url,
    resourceType: expectedResourceType,
  };
}

/**
 * Creates a Cloudinary media service.
 *
 * The client factory is injectable so the service can be tested
 * without real Cloudinary credentials or network requests.
 */
export function createCloudinaryMediaService(
  getClient: typeof getCloudinary = getCloudinary,
): CloudinaryMediaService {
  async function uploadMedia(
    buffer: Buffer,
    resourceType: CloudinaryResourceType,
  ): Promise<UploadResult> {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('A non-empty media buffer is required');
    }

    if (!isResourceType(resourceType)) {
      throw new Error('Unsupported Cloudinary resource type');
    }

    const cloudinary = getClient();

    return new Promise<UploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: PRODUCT_MEDIA_FOLDER,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          try {
            resolve(validateUploadResult(result, resourceType));
          } catch (validationError: unknown) {
            reject(validationError);
          }
        },
      );

      // Handle stream errors separately from the upload callback.
      uploadStream.once('error', reject);

      // Wrap the Buffer in an array to send it as one binary chunk.
      const source = Readable.from([buffer]);

      source.once('error', reject);
      source.pipe(uploadStream);
    });
  }

  async function deleteMedia(
    publicId: string,
    resourceType: CloudinaryResourceType,
  ): Promise<void> {
    if (typeof publicId !== 'string' || publicId.trim().length === 0) {
      throw new Error('Cloudinary public ID is required');
    }

    if (!isResourceType(resourceType)) {
      throw new Error('Unsupported Cloudinary resource type');
    }

    const cloudinary = getClient();

    await new Promise<void>((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        {
          resource_type: resourceType,
          invalidate: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (result?.result === 'ok') {
            resolve();
            return;
          }

          // Idempotent cleanup: the desired state is already achieved.
          if (result?.result === 'not found') {
            resolve();
            return;
          }

          reject(
            new Error('Cloudinary returned an unexpected deletion result'),
          );
        },
      );
    });
  }

  return {
    uploadMedia,
    deleteMedia,
  };
}

// Default production service used by Product Controller.
const cloudinaryMediaService = createCloudinaryMediaService();

export const uploadMedia = cloudinaryMediaService.uploadMedia;
export const deleteMedia = cloudinaryMediaService.deleteMedia;
