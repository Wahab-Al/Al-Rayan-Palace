import { Router } from 'express';

import { getPublicProduct } from '../controller/public-product.controller.js';
import Product from '../models/product.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const category = typeof req.query.category === 'string' ? req.query.category : 'all';

    const featured = typeof req.query.featured === 'string' ? req.query.featured : 'all';

    const parsedPage = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : 1;

    const parsedLimit =
      typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 12;

    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 12) : 12;

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

    const [previewData] = await Product.aggregate<{
      categoryPreviews: Array<{ name: string; mediaUrl: string; mediaType: 'image' | 'video' }>;
      allPreview: { mediaUrl: string; mediaType: 'image' | 'video' }[];
    }>([
      { $sort: { featured: -1, createdAt: -1 } },
      {
        $facet: {
          categoryPreviews: [
            {
              $group: {
                _id: '$category',
                mediaUrl: { $first: '$mediaUrl' },
                mediaType: { $first: '$mediaType' },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, name: '$_id', mediaUrl: 1, mediaType: 1 } },
          ],
          allPreview: [{ $limit: 1 }, { $project: { _id: 0, mediaUrl: 1, mediaType: 1 } }],
        },
      },
    ]);

    const categoryPreviews = previewData?.categoryPreviews ?? [];
    const categories = categoryPreviews.map((preview) => preview.name);
    const allPreview = previewData?.allPreview[0] ?? null;

    res.json({
      items: items.map((product) => ({
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
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),

      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),

      categories: categories.sort(),

      categoryPreviews,

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
