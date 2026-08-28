import { Router } from 'express';
import * as productController from '../controllers/product-controller.js';
import { parentCommentController } from '../controllers/comment-controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import asyncHandler from '../utils/async-handler.js';
import {
  bestProductsQuery,
  commentBody,
  commentsQuery,
  createProductBody,
  idParams,
  listQuery,
  updateProductBody,
} from '../validators/schemas.js';

const router = Router();
const productIdParams = idParams('productId');
const comments = parentCommentController('product', 'productId');

router.route('/')
  .get(optionalAuth, validate({ query: listQuery }), asyncHandler(productController.list))
  .post(requireAuth, validate({ body: createProductBody }), asyncHandler(productController.create));

router.get(
  '/best',
  optionalAuth,
  validate({ query: bestProductsQuery }),
  asyncHandler(productController.best),
);

router.route('/:productId')
  .get(optionalAuth, validate({ params: productIdParams }), asyncHandler(productController.get))
  .patch(
    requireAuth,
    validate({ params: productIdParams, body: updateProductBody }),
    asyncHandler(productController.update),
  )
  .delete(
    requireAuth,
    validate({ params: productIdParams }),
    asyncHandler(productController.remove),
  );

router.route('/:productId/likes')
  .post(
    requireAuth,
    validate({ params: productIdParams }),
    asyncHandler(productController.like),
  )
  .delete(
    requireAuth,
    validate({ params: productIdParams }),
    asyncHandler(productController.unlike),
  );

router.route('/:productId/comments')
  .get(
    optionalAuth,
    validate({ params: productIdParams, query: commentsQuery }),
    asyncHandler(comments.list),
  )
  .post(
    requireAuth,
    validate({ params: productIdParams, body: commentBody }),
    asyncHandler(comments.create),
  );

export default router;
