import { Router } from 'express';

import { getPublicProduct } from '../controller/public-product.controller.js';
import Product from '../models/product.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : 'all';

    const featured = typeof req.query.featured === 'string' ? req.query.featured : 'all';

    const parsedPage = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : 1;

    const parsedLimit =
      typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 10;

    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 10) : 10;

    const filter: Record<string, unknown> = {};

    if (category !== 'all') {
      filter.category = category;
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    const total = await Product.countDocuments(filter);

    const items = await Product.find(filter)
      .sort({
        featured: -1,
        createdAt: -1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const categories = await Product.distinct('category');

    const categoryPreviews = await Promise.all(
      categories.map(async (categoryName) => {
        const product = await Product.findOne({
          category: categoryName,
        })
          .sort({
            featured: -1,
            createdAt: -1,
          })
          .select({
            mediaUrl: 1,
            mediaType: 1,
          })
          .lean();

        if (!product) {
          return null;
        }

        return {
          name: categoryName,
          mediaUrl: product.mediaUrl,
          mediaType: product.mediaType,
        };
      }),
    );

    const allPreview = await Product.findOne()
      .sort({
        featured: -1,
        createdAt: -1,
      })
      .select({
        mediaUrl: 1,
        mediaType: 1,
      })
      .lean();

    res.json({
      items: items.map((product) => ({
        id: product._id.toString(),
        title: product.title,

        ...(product.description ? { description: product.description } : {}),

        category: product.category,
        mediaUrl: product.mediaUrl,
        mediaType: product.mediaType,

        ...(product.mediaPublicId ? { mediaPublicId: product.mediaPublicId } : {}),

        featured: product.featured,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),

      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),

      categories: categories.sort(),

      categoryPreviews: categoryPreviews.filter(
        (item): item is NonNullable<typeof item> => item !== null,
      ),

      allPreview: allPreview
        ? {
            mediaUrl: allPreview.mediaUrl,
            mediaType: allPreview.mediaType,
          }
        : null,
    });
  } catch {
    res.status(500).json({
      message: 'Server error',
    });
  }
});

router.get('/:id', getPublicProduct);

export default router;
