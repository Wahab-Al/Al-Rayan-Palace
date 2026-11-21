
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { validateUploadedMedia } from '../middleware/validateUploadedMedia.js';
import {
  createProduct,
  deleteProduct,
  getAdminProduct,
  getAdminProducts,
  updateProduct,
} from '../controller/product.controller.js';

import { requireAdmin } from '../middleware/requireAdmin.js';
import { requireTrustedOrigin } from '../middleware/requireTrustedOrigin.js';
import { uploadConcurrency } from '../middleware/uploadConcurrency.js';
import { uploadMedia } from '../middleware/uploadMedia.js';

const router = Router();

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
});

router.use(adminLimiter);
router.use(requireAdmin);
router.use(requireTrustedOrigin);

router.get('/', getAdminProducts);

router.get('/:id', getAdminProduct);

router.post(
  '/',
  uploadLimiter,
  uploadConcurrency,
  uploadMedia.array('media', 3),
  validateUploadedMedia,
  createProduct,
);

router.patch(
  '/:id',
  uploadLimiter,
  uploadConcurrency,
  uploadMedia.array('media', 3),
  validateUploadedMedia,
  updateProduct,
);

router.delete('/:id', deleteProduct);

export default router;
