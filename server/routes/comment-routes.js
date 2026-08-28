import { Router } from 'express';
import * as commentController from '../controllers/comment-controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import asyncHandler from '../utils/async-handler.js';
import { commentBody, idParams } from '../validators/schemas.js';

const router = Router();
const commentIdParams = idParams('commentId');

router.route('/:commentId')
  .patch(
    requireAuth,
    validate({ params: commentIdParams, body: commentBody }),
    asyncHandler(commentController.update),
  )
  .delete(
    requireAuth,
    validate({ params: commentIdParams }),
    asyncHandler(commentController.remove),
  );

export default router;
