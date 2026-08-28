import { Router } from 'express';
import { uploadProductImages } from '../controllers/upload-controller.js';
import { requireAuth } from '../middleware/auth.js';
import {
  prepareImageUpload,
  uploadImages,
  verifyImageSignatures,
  verifyUploadQuota,
} from '../middleware/upload.js';
import { uploadRateLimit } from '../middleware/rate-limit.js';
import asyncHandler from '../utils/async-handler.js';

const router = Router();

router.post(
  '/images',
  requireAuth,
  uploadRateLimit,
  prepareImageUpload,
  uploadImages,
  verifyImageSignatures,
  verifyUploadQuota,
  asyncHandler(uploadProductImages),
);

export default router;
