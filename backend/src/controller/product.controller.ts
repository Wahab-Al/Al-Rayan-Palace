import type { RequestHandler } from 'express';
import mongoose from 'mongoose';

import Product, { type IProduct } from '../models/product.js';
import {
  deleteMedia,
  uploadMedia,
  type CloudinaryResourceType,
} from '../services/cloudinary.service.js';

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

export function parseInstagramUrl(value: unknown): string | undefined {
  const candidate = cleanOptionalString(value);

  if (!candidate) {
    return undefined;
  }

  if (candidate.length > 2048) {
    throw new Error('Instagram reference must be a valid HTTPS Instagram URL');
  }

  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Instagram reference must be a valid HTTPS Instagram URL');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    parsed.protocol !== 'https:' ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    (hostname !== 'instagram.com' && hostname !== 'www.instagram.com')
  ) {
    throw new Error('Instagram reference must be a valid HTTPS Instagram URL');
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

export const getAdminProducts: RequestHandler = async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : 'all';

    const search = typeof req.query.search === 'string' ? req.query.search : '';

    const mediaType = typeof req.query.mediaType === 'string' ? req.query.mediaType : 'all';

    const featured = typeof req.query.featured === 'string' ? req.query.featured : 'all';

    const parsedPage = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : 1;

    const parsedLimit =
      typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 20;

    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 20) : 20;

    const filter = buildAdminProductFilter({
      search,
      category,
      mediaType,
      featured,
    });

    const total = await Product.countDocuments(filter);

    const items = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
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
  } catch {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

export const getAdminProduct: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
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
  } catch {
    res.status(500).json({
      message: 'Server error',
    });
  }
};

export const createProduct: RequestHandler = async (req, res) => {
  const uploadedMedia: { publicId: string; resourceType: CloudinaryResourceType }[] = [];

  try {
    const title = requireString(req.body.title, 'title');
    const category = requireString(req.body.category, 'category');

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

    const instagramUrl = parseInstagramUrl(req.body.instagramUrl);

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({
        message: 'Media file is required',
      });
      return;
    }

    const mediaSelectionError = validateMediaSelection(files);
    if (mediaSelectionError) {
      res.status(400).json({ message: mediaSelectionError });
      return;
    }

    const description = cleanOptionalString(req.body.description);

    if (description && description.length > 1000) {
      res.status(400).json({
        message: 'Description must be 1000 characters or less',
      });
      return;
    }

    const featured = parseBoolean(req.body.featured, false);

    const firstFile = files[0];
    if (!firstFile) throw new Error('Media file is required');
    const mediaType = getMediaType(firstFile.mimetype);
    const uploaded: Awaited<ReturnType<typeof uploadMedia>>[] = [];
    for (const file of files) {
      const media = await uploadMedia(file.buffer, mediaType);
      uploaded.push(media);
      uploadedMedia.push({ publicId: media.publicId, resourceType: media.resourceType });
    }

    const primaryMedia = uploaded[0];
    if (!primaryMedia) throw new Error('Media upload failed');

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
        ? { gallery: uploaded.map((media) => ({ url: media.secureUrl, publicId: media.publicId })) }
        : {}),
    };

    const product = await Product.create(productData);

    res.status(201).json({
      item: mapProduct(product),
    });
  } catch (error) {
    for (const media of uploadedMedia) {
      try {
        await deleteMedia(media.publicId, media.resourceType);
      } catch {
        // Ignore cleanup failure; the request still reports the original error.
      }
    }

    const message = error instanceof Error ? error.message : 'Server error';

    if (
      message.includes('is required') ||
      message.includes('characters or less') ||
      message.includes('Instagram reference') ||
      message.includes('Cloudinary')
    ) {
      res.status(400).json({ message });
      return;
    }

    res.status(500).json({
      message: 'Server error',
    });
  }
};

export const updateProduct: RequestHandler = async (req, res) => {
  const uploadedMedia: { publicId: string; resourceType: CloudinaryResourceType }[] = [];

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
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

    // Keep the old Cloudinary media information
    // BEFORE changing the product.
    const oldMedia = product.gallery?.length
      ? product.gallery.map((image) => ({
          publicId: image.publicId,
          resourceType: 'image' as const,
        }))
      : product.mediaPublicId
        ? [{ publicId: product.mediaPublicId, resourceType: product.mediaType }]
        : [];

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : product.title;

    const category =
      typeof req.body.category === 'string' ? req.body.category.trim() : product.category;

    const description =
      typeof req.body.description === 'string' ? req.body.description.trim() : product.description;

    const featured = parseBoolean(req.body.featured, product.featured);

    const instagramUrl =
      typeof req.body.instagramUrl === 'string'
        ? parseInstagramUrl(req.body.instagramUrl)
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
        res.status(400).json({ message: mediaSelectionError });
        return;
      }

      const firstFile = files[0];
      if (!firstFile) throw new Error('Media file is required');
      const nextType = getMediaType(firstFile.mimetype);
      const uploaded: Awaited<ReturnType<typeof uploadMedia>>[] = [];
      for (const file of files) {
        const media = await uploadMedia(file.buffer, nextType);
        uploaded.push(media);
        uploadedMedia.push({ publicId: media.publicId, resourceType: media.resourceType });
      }
      const primaryMedia = uploaded[0];
      if (!primaryMedia) throw new Error('Media upload failed');
      product.mediaUrl = primaryMedia.secureUrl;
      product.mediaType = primaryMedia.resourceType;
      product.mediaPublicId = primaryMedia.publicId;
      nextGallery =
        nextType === 'image'
          ? uploaded.map((media) => ({ url: media.secureUrl, publicId: media.publicId }))
          : undefined;
    }

    product.title = title;
    product.category = category;
    product.description = description || undefined;
    product.featured = featured;
    product.set('instagramUrl', instagramUrl);

    if (files.length > 0) {
      product.set('gallery', nextGallery);
    }

    await product.save();

    // DB now points to the new media.
    // Only after a successful save do we remove
    // the old Cloudinary media.
    if (files.length > 0) {
      for (const media of oldMedia) {
        if (uploadedMedia.some((newMedia) => newMedia.publicId === media.publicId)) continue;
        try {
          await deleteMedia(media.publicId, media.resourceType);
        } catch (error) {
          console.error('Failed to delete old Cloudinary media:', error);
        }
      }
    }

    res.json({
      item: mapProduct(product),
    });
  } catch (error) {
    // If the new media was uploaded but the DB update failed,
    // remove the newly uploaded media to avoid an orphan.
    for (const media of uploadedMedia) {
      try {
        await deleteMedia(media.publicId, media.resourceType);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded media:', cleanupError);
      }
    }

    const message = error instanceof Error ? error.message : 'Server error';

    if (message.includes('Instagram reference')) {
      res.status(400).json({ message });
      return;
    }

    res.status(500).json({
      message,
    });
  }
};
export const deleteProduct: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
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

    await Product.findByIdAndDelete(id);

    const mediaToDelete = product.gallery?.length
      ? product.gallery.map((image) => ({
          publicId: image.publicId,
          resourceType: 'image' as const,
        }))
      : product.mediaPublicId
        ? [{ publicId: product.mediaPublicId, resourceType: product.mediaType }]
        : [];
    for (const media of mediaToDelete) {
      try {
        await deleteMedia(media.publicId, media.resourceType);
      } catch {
        // ignore Cloudinary cleanup failure
      }
    }

    res.status(204).send();
  } catch {
    res.status(500).json({
      message: 'Server error',
    });
  }
};
