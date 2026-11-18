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

const router = Router();

router.use(requireAdmin);

router.get('/', getAdminProducts);

router.get('/:id', getAdminProduct);

router.post('/', uploadMedia.single('media'), createProduct);

router.patch('/:id', uploadMedia.single('media'), updateProduct);

router.delete('/:id', deleteProduct);

export default router;
