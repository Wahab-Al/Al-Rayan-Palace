import type { RequestHandler } from 'express';
import mongoose from 'mongoose';

import Product from '../models/product.js';

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

export const getPublicProduct: RequestHandler = async (
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

    const product = await Product.findById(id).lean();

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