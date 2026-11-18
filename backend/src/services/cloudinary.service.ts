import { Readable } from 'node:stream';
import { getCloudinary } from '../config/cloudinary.js';

export type CloudinaryResourceType = 'image' | 'video';

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: CloudinaryResourceType;
}

export async function uploadMedia(
  buffer: Buffer,
  resourceType: CloudinaryResourceType,
): Promise<UploadResult> {
  const cloudinary = getCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'alrayan-palacee/products',
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }

        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          resourceType: result.resource_type === 'video'
            ? 'video'
            : 'image',
        });
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function deleteMedia(
  publicId: string,
  resourceType: CloudinaryResourceType,
): Promise<void> {
  const cloudinary = getCloudinary();

  await new Promise<void>((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: resourceType,
        invalidate: true,
      },
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );
  });
}