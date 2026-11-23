import type { RequestHandler } from 'express';

import mongoose from 'mongoose';

import Product, { type IProduct } from '../models/product.js';

import {
  deleteMedia,
  uploadMedia,
  type CloudinaryResourceType,
} from '../services/cloudinary.service.js';

import { releaseUploadLease } from '../utils/uploadLease.js';
import { parseBoundedQueryInteger } from '../utils/pagination.js';

// -----------------------------------------------------------------------------

// Validation and normalization helpers

// -----------------------------------------------------------------------------

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') return true;

    if (value === 'false') return false;
  }

  return fallback;
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

const INSTAGRAM_URL_ERROR = 'Instagram reference must be a valid HTTPS Instagram URL';

export function parseInstagramUrl(value: unknown): string | undefined {
  const candidate = cleanOptionalString(value);

  if (!candidate) {
    return undefined;
  }

  if (candidate.length > 2048) {
    throw new Error(INSTAGRAM_URL_ERROR);
  }

  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(INSTAGRAM_URL_ERROR);
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    parsed.protocol !== 'https:' ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    (hostname !== 'instagram.com' && hostname !== 'www.instagram.com')
  ) {
    throw new Error(INSTAGRAM_URL_ERROR);
  }

  return parsed.toString();
}

function escapeSearchText(value: string): string {
  return value
    .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

export function buildAdminProductFilter(filters: {
  search: string;

  category: string;

  mediaType: string;

  featured: string;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (filters.category !== 'all') {
    filter.category = filters.category;
  }

  if (filters.mediaType === 'image' || filters.mediaType === 'video') {
    filter.mediaType = filters.mediaType;
  }

  if (filters.featured === 'true') {
    filter.featured = true;
  } else if (filters.featured === 'false') {
    filter.featured = false;
  }

  const search = filters.search.trim().slice(0, 120);

  if (search) {
    const expression = new RegExp(escapeSearchText(search), 'i');

    const conditions: Record<string, unknown>[] = [
      { title: expression },

      { category: expression },

      { mediaType: expression },
    ];

    const normalizedSearch = search.toLowerCase();

    if (
      normalizedSearch === 'featured' ||
      normalizedSearch === 'true' ||
      normalizedSearch === 'yes'
    ) {
      conditions.push({ featured: true });
    } else if (
      normalizedSearch === 'not featured' ||
      normalizedSearch === 'false' ||
      normalizedSearch === 'no'
    ) {
      conditions.push({ featured: false });
    }

    filter.$or = conditions;
  }

  return filter;
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function getMediaType(mimetype: string): CloudinaryResourceType {
  return mimetype.startsWith('video/') ? 'video' : 'image';
}

export function validateMediaSelection(files: Array<{ mimetype: string }>): string | null {
  if (files.length < 1 || files.length > 3) {
    return 'Choose 1 to 3 images or one video';
  }

  const types = new Set(files.map((file) => getMediaType(file.mimetype)));

  if (types.size !== 1 || (types.has('video') && files.length !== 1)) {
    return 'Upload 1 to 3 images or one video per product';
  }

  return null;
}

/**

 * Identifies expected client-side validation errors.

 * Unexpected provider, database, and programming errors must not be

 * returned directly to clients.

 */

function isProductValidationError(message: string): boolean {
  return (
    message.endsWith(' is required') ||
    message.includes('characters or less') ||
    message === INSTAGRAM_URL_ERROR ||
    message === 'Media file is required'
  );
}

/**

 * Returns a generic server error without exposing internal exception details.

 */

function sendInternalServerError(res: Parameters<RequestHandler>[1]): void {
  if (!res.headersSent) {
    res.status(500).json({
      message: 'Server error',
    });
  }
}

type ProductForMapping = {
  _id: mongoose.Types.ObjectId;

  title: string;

  description?: string;

  category: string;

  mediaUrl: string;

  mediaType: 'image' | 'video';

  mediaPublicId?: string;

  gallery?: { url: string; publicId: string }[];

  featured: boolean;

  instagramUrl?: string;

  createdAt?: Date;

  updatedAt?: Date;
};

function mapProduct(product: ProductForMapping) {
  if (!product.createdAt || !product.updatedAt) {
    throw new Error('Product timestamps are missing');
  }

  return {
    id: product._id.toString(),

    title: product.title,

    ...(product.description ? { description: product.description } : {}),

    category: product.category,

    mediaUrl: product.mediaUrl,

    mediaType: product.mediaType,

    ...(product.mediaPublicId ? { mediaPublicId: product.mediaPublicId } : {}),

    ...(product.mediaType === 'image'
      ? {
          images: product.gallery?.length
            ? product.gallery.map((image) => image.url)
            : [product.mediaUrl],
        }
      : {}),

    featured: product.featured,

    ...(product.instagramUrl ? { instagramUrl: product.instagramUrl } : {}),

    createdAt: product.createdAt,

    updatedAt: product.updatedAt,
  };
}

export type NewProductInput = Omit<IProduct, 'createdAt' | 'updatedAt'>;

export type ProductWriteDocument = ProductForMapping & {
  set(path: string, value: unknown): unknown;

  save(): Promise<unknown>;
};

export interface ProductWriteDependencies {
  uploadMedia: typeof uploadMedia;

  deleteMedia: typeof deleteMedia;

  createProductRecord: (data: NewProductInput) => Promise<ProductForMapping>;

  findProductByIdRecord: (id: string) => Promise<ProductWriteDocument | null>;
}

const defaultProductWriteDependencies: ProductWriteDependencies = {
  uploadMedia,

  deleteMedia,

  createProductRecord: async (data) => (await Product.create(data)) as unknown as ProductForMapping,

  findProductByIdRecord: async (id) =>
    (await Product.findById(id)) as unknown as ProductWriteDocument | null,
};

// -----------------------------------------------------------------------------

// Admin product read operations

// -----------------------------------------------------------------------------

export const getAdminProducts: RequestHandler = async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : 'all';

    const search = typeof req.query.search === 'string' ? req.query.search : '';

    const mediaType = typeof req.query.mediaType === 'string' ? req.query.mediaType : 'all';

    const featured = typeof req.query.featured === 'string' ? req.query.featured : 'all';

    const page = parseBoundedQueryInteger(req.query.page, 1, 10_000);
    const limit = parseBoundedQueryInteger(req.query.limit, 20, 20);

    if (page === null || limit === null) {
      res.status(400).json({ message: 'Invalid pagination parameters' });
      return;
    }

    const filter = buildAdminProductFilter({
      search,

      category,

      mediaType,

      featured,
    });

    const total = await Product.countDocuments(filter).maxTimeMS(5000);

    const items = await Product.find(filter)

      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .maxTimeMS(5000)
      .limit(limit)
      .lean();

    const categories = await Product.distinct('category');

    res.json({
      items: items.map(mapProduct),

      total,

      page,

      pages: Math.max(1, Math.ceil(total / limit)),

      categories: categories.sort(),
    });
  } catch (error: unknown) {
    console.error('[getAdminProducts] Failed to retrieve products:', error);

    sendInternalServerError(res);
  }
};

export const getAdminProduct: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;

    if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
      res.status(400).json({
        message: 'Invalid product id',
      });

      return;
    }

    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({
        message: 'Product not found',
      });

      return;
    }

    res.json({
      item: mapProduct(product),
    });
  } catch (error: unknown) {
    console.error('[getAdminProduct] Failed to retrieve product:', error);

    sendInternalServerError(res);
  }
};

// -----------------------------------------------------------------------------

// Product creation

// -----------------------------------------------------------------------------

export function createProductWriteHandlers(overrides: Partial<ProductWriteDependencies> = {}) {
  const dependencies: ProductWriteDependencies = {
    ...defaultProductWriteDependencies,

    ...overrides,
  };

  const createProductHandler: RequestHandler = async (req, res) => {
    const uploadedMedia: {
      publicId: string;

      resourceType: CloudinaryResourceType;
    }[] = [];

    // Tracks whether MongoDB successfully created the product.

    let productSaved = false;

    try {
      const body = req.body ?? {};

      const title = requireString(body.title, 'title');

      const category = requireString(body.category, 'category');

      if (title.length > 120) {
        res.status(400).json({
          message: 'Title must be 120 characters or less',
        });

        return;
      }

      if (category.length > 80) {
        res.status(400).json({
          message: 'Category must be 80 characters or less',
        });

        return;
      }

      const instagramUrl = parseInstagramUrl(body.instagramUrl);

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];

      if (files.length === 0) {
        res.status(400).json({
          message: 'Media file is required',
        });

        return;
      }

      const mediaSelectionError = validateMediaSelection(files);

      if (mediaSelectionError) {
        res.status(400).json({
          message: mediaSelectionError,
        });

        return;
      }

      const description = cleanOptionalString(body.description);

      if (description && description.length > 1000) {
        res.status(400).json({
          message: 'Description must be 1000 characters or less',
        });

        return;
      }

      const featured = parseBoolean(body.featured, false);

      const firstFile = files[0];

      if (!firstFile) {
        throw new Error('Media file is required');
      }

      const mediaType = getMediaType(firstFile.mimetype);

      const uploaded: Awaited<ReturnType<typeof uploadMedia>>[] = [];

      for (const file of files) {
        const media = await dependencies.uploadMedia(file.buffer, mediaType);

        uploaded.push(media);

        uploadedMedia.push({
          publicId: media.publicId,

          resourceType: media.resourceType,
        });
      }

      const primaryMedia = uploaded[0];

      if (!primaryMedia) {
        throw new Error('Media upload failed');
      }

      const productData = {
        title,

        category,

        mediaUrl: primaryMedia.secureUrl,

        mediaType: primaryMedia.resourceType,

        featured,

        ...(description ? { description } : {}),

        ...(instagramUrl ? { instagramUrl } : {}),

        mediaPublicId: primaryMedia.publicId,

        ...(mediaType === 'image'
          ? {
              gallery: uploaded.map((media) => ({
                url: media.secureUrl,

                publicId: media.publicId,
              })),
            }
          : {}),
      };

      const product = await dependencies.createProductRecord(productData);

      // The product now references the uploaded Cloudinary assets.

      productSaved = true;

      res.status(201).json({
        item: mapProduct(product),
      });
    } catch (error: unknown) {
      // Do not delete uploaded assets if MongoDB already created the product.

      if (!productSaved) {
        for (const media of uploadedMedia) {
          try {
            await dependencies.deleteMedia(media.publicId, media.resourceType);
          } catch (cleanupError: unknown) {
            console.error(
              '[createProduct] Failed to clean up newly uploaded media:',

              {
                publicId: media.publicId,

                error: cleanupError,
              },
            );
          }
        }
      }

      const message = error instanceof Error ? error.message : '';

      if (isProductValidationError(message) || error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({
          message:
            error instanceof mongoose.Error.ValidationError ? 'Invalid product data' : message,
        });

        return;
      }

      console.error('[createProduct] Failed to create product:', error);

      sendInternalServerError(res);
    } finally {
      releaseUploadLease(req);
    }
  };

  // -----------------------------------------------------------------------------

  // Product update

  // -----------------------------------------------------------------------------

  const updateProductHandler: RequestHandler = async (req, res) => {
    const uploadedMedia: {
      publicId: string;

      resourceType: CloudinaryResourceType;
    }[] = [];

    // Tracks whether MongoDB successfully saved the update.

    let productSaved = false;

    try {
      const { id } = req.params;

      const body = req.body ?? {};

      if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
        res.status(400).json({
          message: 'Invalid product id',
        });

        return;
      }

      const product = await dependencies.findProductByIdRecord(id);

      if (!product) {
        res.status(404).json({
          message: 'Product not found',
        });

        return;
      }

      // Preserve old Cloudinary references before changing the product.

      const oldMedia = product.gallery?.length
        ? product.gallery.map((image) => ({
            publicId: image.publicId,

            resourceType: 'image' as const,
          }))
        : product.mediaPublicId
          ? [
              {
                publicId: product.mediaPublicId,

                resourceType: product.mediaType,
              },
            ]
          : [];

      // Normalize incoming fields; omitted fields retain existing values.

      const title = typeof body.title === 'string' ? body.title.trim() : product.title;

      const category = typeof body.category === 'string' ? body.category.trim() : product.category;

      const description =
        typeof body.description === 'string' ? body.description.trim() : product.description;

      const featured = parseBoolean(body.featured, product.featured);

      const instagramUrl =
        typeof body.instagramUrl === 'string'
          ? parseInstagramUrl(body.instagramUrl)
          : product.instagramUrl;

      if (!title) {
        res.status(400).json({
          message: 'Title is required',
        });

        return;
      }

      if (!category) {
        res.status(400).json({
          message: 'Category is required',
        });

        return;
      }

      if (title.length > 120) {
        res.status(400).json({
          message: 'Title must be 120 characters or less',
        });

        return;
      }

      if (category.length > 80) {
        res.status(400).json({
          message: 'Category must be 80 characters or less',
        });

        return;
      }

      if (description && description.length > 1000) {
        res.status(400).json({
          message: 'Description must be 1000 characters or less',
        });

        return;
      }

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];

      let nextGallery: { url: string; publicId: string }[] | undefined;

      if (files.length > 0) {
        const mediaSelectionError = validateMediaSelection(files);

        if (mediaSelectionError) {
          res.status(400).json({
            message: mediaSelectionError,
          });

          return;
        }

        const firstFile = files[0];

        if (!firstFile) {
          throw new Error('Media file is required');
        }

        const nextType = getMediaType(firstFile.mimetype);

        const uploaded: Awaited<ReturnType<typeof uploadMedia>>[] = [];

        for (const file of files) {
          const media = await dependencies.uploadMedia(file.buffer, nextType);

          uploaded.push(media);

          uploadedMedia.push({
            publicId: media.publicId,

            resourceType: media.resourceType,
          });
        }

        const primaryMedia = uploaded[0];

        if (!primaryMedia) {
          throw new Error('Media upload failed');
        }

        product.mediaUrl = primaryMedia.secureUrl;

        product.mediaType = primaryMedia.resourceType;

        product.mediaPublicId = primaryMedia.publicId;

        nextGallery =
          nextType === 'image'
            ? uploaded.map((media) => ({
                url: media.secureUrl,

                publicId: media.publicId,
              }))
            : undefined;
      }

      // Apply product updates.

      product.title = title;

      product.category = category;

      product.description = description || undefined;

      product.featured = featured;

      product.set('instagramUrl', instagramUrl);

      // Keep the existing gallery if no replacement media was supplied.

      if (files.length > 0) {
        product.set('gallery', nextGallery);
      }

      await product.save();

      // MongoDB now references the new media.

      productSaved = true;

      // Delete previous assets only after the database update succeeds.

      if (files.length > 0) {
        for (const media of oldMedia) {
          const isStillReferenced = uploadedMedia.some(
            (newMedia) => newMedia.publicId === media.publicId,
          );

          if (isStillReferenced) {
            continue;
          }

          try {
            await dependencies.deleteMedia(media.publicId, media.resourceType);
          } catch (cleanupError: unknown) {
            // The product update has succeeded. Do not roll it back because

            // cleanup of an old external asset failed.

            console.error(
              '[updateProduct] Failed to delete old Cloudinary media:',

              {
                publicId: media.publicId,

                error: cleanupError,
              },
            );
          }
        }
      }

      res.status(200).json({
        item: mapProduct(product),
      });
    } catch (error: unknown) {
      // If MongoDB did not confirm the update, attempt to remove new uploads.

      if (!productSaved) {
        for (const media of uploadedMedia) {
          try {
            await dependencies.deleteMedia(media.publicId, media.resourceType);
          } catch (cleanupError: unknown) {
            // Preserve the original failure if cleanup also fails.

            console.error(
              '[updateProduct] Failed to clean up newly uploaded media:',

              {
                publicId: media.publicId,

                error: cleanupError,
              },
            );
          }
        }
      }

      const message = error instanceof Error ? error.message : '';

      if (message === INSTAGRAM_URL_ERROR) {
        res.status(400).json({
          message: INSTAGRAM_URL_ERROR,
        });

        return;
      }

      if (error instanceof mongoose.Error.ValidationError) {
        res.status(400).json({
          message: 'Invalid product data',
        });

        return;
      }

      console.error('[updateProduct] Failed to update product:', error);

      sendInternalServerError(res);
    } finally {
      releaseUploadLease(req);
    }
  };

  return {
    createProduct: createProductHandler,
    updateProduct: updateProductHandler,
  };
}

const productWriteHandlers = createProductWriteHandlers();

export const createProduct = productWriteHandlers.createProduct;
export const updateProduct = productWriteHandlers.updateProduct;

// -----------------------------------------------------------------------------

// Product deletion

// -----------------------------------------------------------------------------

interface ProductMediaReferenceSource {
  mediaType: CloudinaryResourceType;

  mediaPublicId?: string;

  gallery?: { url: string; publicId: string }[];
}

interface DeleteProductDependencies {
  findByIdAndDelete: (id: string) => Promise<ProductMediaReferenceSource | null>;

  deleteMedia: typeof deleteMedia;
}

/**

 * Creates a product deletion handler with injectable dependencies.

 *

 * MongoDB atomically deletes the product and returns the document

 * containing the actual media references that must be cleaned up.

 */

export function createDeleteProductHandler(
  dependencies: DeleteProductDependencies = {
    findByIdAndDelete: async (id) => Product.findByIdAndDelete(id).exec(),

    deleteMedia,
  },
): RequestHandler {
  return async (req, res) => {
    try {
      const id = req.params.id;

      if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
        res.status(400).json({
          message: 'Invalid product id',
        });

        return;
      }

      // Atomically delete the product and retrieve its final document.

      const product = await dependencies.findByIdAndDelete(id);

      if (!product) {
        res.status(404).json({
          message: 'Product not found',
        });

        return;
      }

      const mediaToDelete: {
        publicId: string;

        resourceType: CloudinaryResourceType;
      }[] = product.gallery?.length
        ? product.gallery.map((image) => ({
            publicId: image.publicId,

            resourceType: 'image',
          }))
        : product.mediaPublicId
          ? [
              {
                publicId: product.mediaPublicId,

                resourceType: product.mediaType,
              },
            ]
          : [];

      // Avoid sending duplicate deletion requests for the same asset.

      const uniqueMedia = new Map<string, (typeof mediaToDelete)[number]>();

      for (const media of mediaToDelete) {
        const key = `${media.resourceType}:${media.publicId}`;

        uniqueMedia.set(key, media);
      }

      // MongoDB deletion has already succeeded.

      // Cloudinary cleanup is best-effort and must not reverse that result.

      for (const media of uniqueMedia.values()) {
        try {
          await dependencies.deleteMedia(
            media.publicId,

            media.resourceType,
          );
        } catch (cleanupError: unknown) {
          console.error(
            '[deleteProduct] Failed to delete Cloudinary media:',

            {
              publicId: media.publicId,

              resourceType: media.resourceType,

              error: cleanupError,
            },
          );
        }
      }

      res.status(204).send();
    } catch (error: unknown) {
      console.error('[deleteProduct] Failed to delete product:', error);

      sendInternalServerError(res);
    }
  };
}

export const deleteProduct = createDeleteProductHandler();
