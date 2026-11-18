import type { RequestHandler } from 'express';
import mongoose from 'mongoose';

import Product, { type IProduct } from '../models/product.js';
import {
  deleteMedia,
  uploadMedia,
  type CloudinaryResourceType,
} from '../services/cloudinary.service.js';

function parseBoolean(
  value: unknown,
  fallback = false,
): boolean {
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

    if (normalizedSearch === 'featured' || normalizedSearch === 'true' || normalizedSearch === 'yes') {
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

function requireString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function getMediaType(
  mimetype: string,
): CloudinaryResourceType {
  return mimetype.startsWith('video/')
    ? 'video'
    : 'image';
}

type ProductForMapping = {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaPublicId?: string;
  featured: boolean;
  instagramUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function mapProduct(product: ProductForMapping) {
  if (!product.createdAt || !product.updatedAt) {
    throw new Error(
      'Product timestamps are missing',
    );
  }

  return {
    id: product._id.toString(),
    title: product.title,

    ...(product.description
      ? { description: product.description }
      : {}),

    category: product.category,
    mediaUrl: product.mediaUrl,
    mediaType: product.mediaType,

    ...(product.mediaPublicId
      ? { mediaPublicId: product.mediaPublicId }
      : {}),

    featured: product.featured,

    ...(product.instagramUrl ? { instagramUrl: product.instagramUrl } : {}),

    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export const getAdminProducts: RequestHandler = async (
  req,
  res,
) => {
  try {
    const category =
      typeof req.query.category === 'string'
        ? req.query.category
        : 'all';

    const search =
      typeof req.query.search === 'string'
        ? req.query.search
        : '';

    const mediaType =
      typeof req.query.mediaType === 'string'
        ? req.query.mediaType
        : 'all';

    const featured =
      typeof req.query.featured === 'string'
        ? req.query.featured
        : 'all';

    const parsedPage =
      typeof req.query.page === 'string'
        ? Number.parseInt(req.query.page, 10)
        : 1;

    const parsedLimit =
      typeof req.query.limit === 'string'
        ? Number.parseInt(req.query.limit, 10)
        : 20;

    const page =
      Number.isFinite(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 20)
        : 20;

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

export const getAdminProduct: RequestHandler = async (
  req,
  res,
) => {
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

export const createProduct: RequestHandler = async (
  req,
  res,
) => {
  let uploadedMedia:
    | {
        publicId: string;
        resourceType: CloudinaryResourceType;
      }
    | undefined;

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

    if (!req.file) {
      res.status(400).json({
        message: 'Media file is required',
      });
      return;
    }

    const description = cleanOptionalString(
      req.body.description,
    );

    if (description && description.length > 1000) {
      res.status(400).json({
        message: 'Description must be 1000 characters or less',
      });
      return;
    }

    const featured = parseBoolean(req.body.featured, false);

    const mediaType = getMediaType(req.file.mimetype);

    const uploaded = await uploadMedia(
      req.file.buffer,
      mediaType,
    );

    uploadedMedia = {
      publicId: uploaded.publicId,
      resourceType: uploaded.resourceType,
    };

    const productData = {
      title,
      category,
      mediaUrl: uploaded.secureUrl,
      mediaType: uploaded.resourceType,
      featured,
      ...(description ? { description } : {}),
      ...(instagramUrl ? { instagramUrl } : {}),
      mediaPublicId: uploaded.publicId,
    };

    const product = await Product.create(productData);

    res.status(201).json({
      item: mapProduct(product),
    });
  } catch (error) {
    if (uploadedMedia) {
      try {
        await deleteMedia(
          uploadedMedia.publicId,
          uploadedMedia.resourceType,
        );
      } catch {
        // ignore cleanup failure
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : 'Server error';

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

export const updateProduct: RequestHandler = async (
  req,
  res,
) => {
  let uploadedMedia:
    | {
        publicId: string;
        resourceType: CloudinaryResourceType;
      }
    | undefined;

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
    const oldMediaPublicId =
      product.mediaPublicId;

    const oldMediaType =
      product.mediaType;

    const title =
      typeof req.body.title === 'string'
        ? req.body.title.trim()
        : product.title;

    const category =
      typeof req.body.category === 'string'
        ? req.body.category.trim()
        : product.category;

    const description =
      typeof req.body.description === 'string'
        ? req.body.description.trim()
        : product.description;

    const featured = parseBoolean(
      req.body.featured,
      product.featured,
    );

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

    let nextMediaUrl =
      product.mediaUrl;

    let nextMediaType =
      product.mediaType;

    let nextMediaPublicId =
      product.mediaPublicId;

    // Upload new media only when a new file was selected.
    if (req.file) {
      const nextType =
        getMediaType(req.file.mimetype);

      const uploaded =
        await uploadMedia(
          req.file.buffer,
          nextType,
        );

      uploadedMedia = {
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
      };

      nextMediaUrl =
        uploaded.secureUrl;

      nextMediaType =
        uploaded.resourceType;

      nextMediaPublicId =
        uploaded.publicId;
    }

    product.title = title;
    product.category = category;
    product.description =
      description || undefined;
    product.featured = featured;
    product.set('instagramUrl', instagramUrl);

    product.mediaUrl =
      nextMediaUrl;

    product.mediaType =
      nextMediaType;

    if (nextMediaPublicId) {
      product.mediaPublicId =
        nextMediaPublicId;
    }

    await product.save();

    // DB now points to the new media.
    // Only after a successful save do we remove
    // the old Cloudinary media.
    if (
      req.file &&
      uploadedMedia &&
      oldMediaPublicId &&
      oldMediaPublicId !== uploadedMedia.publicId
    ) {
      try {
        await deleteMedia(
          oldMediaPublicId,
          oldMediaType,
        );
      } catch (error) {
        console.error(
          'Failed to delete old Cloudinary media:',
          error,
        );
      }
    }

    res.json({
      item: mapProduct(product),
    });
  } catch (error) {
    // If the new media was uploaded but the DB update failed,
    // remove the newly uploaded media to avoid an orphan.
    if (uploadedMedia) {
      try {
        await deleteMedia(
          uploadedMedia.publicId,
          uploadedMedia.resourceType,
        );
      } catch (cleanupError) {
        console.error(
          'Failed to clean up uploaded media:',
          cleanupError,
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : 'Server error';

    if (message.includes('Instagram reference')) {
      res.status(400).json({ message });
      return;
    }

    res.status(500).json({
      message,
    });
  }
};
export const deleteProduct: RequestHandler = async (
  req,
  res,
) => {
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

    if (product.mediaPublicId) {
      try {
        await deleteMedia(
          product.mediaPublicId,
          product.mediaType,
        );
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