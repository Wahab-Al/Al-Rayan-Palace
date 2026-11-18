import { v2 as cloudinary } from 'cloudinary';
import _config from './env.js';

let configured = false;

export function getCloudinary() {
  if (!configured) {
    const cloudName = _config.CLOUDINARY_CLOUD_NAME;
    const apiKey = _config.CLOUDINARY_API_KEY;
    const apiSecret = _config.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary environment variables are not configured');
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}
