import { Router } from 'express';

import {
  createProduct,
  deleteProduct,
  getAdminProduct,
  getAdminProducts,
  updateProduct,
} from '../controller/product.controller.js';

import { requireAdmin } from '../middleware/requireAdmin.js';
import { uploadMedia } from '../middleware/uploadMedia.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const adminLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120 });
const uploadLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10 });

router.use(adminLimiter);
router.use(requireAdmin);

router.get('/', getAdminProducts);

router.get('/:id', getAdminProduct);

router.post('/', uploadLimiter, uploadMedia.array('media', 3), createProduct);

router.patch('/:id', uploadLimiter, uploadMedia.array('media', 3), updateProduct);

router.delete('/:id', deleteProduct);

export default router;
