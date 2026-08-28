import { Router } from 'express';
import * as articleController from '../controllers/article-controller.js';
import { parentCommentController } from '../controllers/comment-controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import asyncHandler from '../utils/async-handler.js';
import {
  commentBody,
  commentsQuery,
  createArticleBody,
  idParams,
  listQuery,
  updateArticleBody,
} from '../validators/schemas.js';

const router = Router();
const articleIdParams = idParams('articleId');
const comments = parentCommentController('article', 'articleId');

router.route('/')
  .get(optionalAuth, validate({ query: listQuery }), asyncHandler(articleController.list))
  .post(requireAuth, validate({ body: createArticleBody }), asyncHandler(articleController.create));

router.route('/:articleId')
  .get(optionalAuth, validate({ params: articleIdParams }), asyncHandler(articleController.get))
  .patch(
    requireAuth,
    validate({ params: articleIdParams, body: updateArticleBody }),
    asyncHandler(articleController.update),
  )
  .delete(
    requireAuth,
    validate({ params: articleIdParams }),
    asyncHandler(articleController.remove),
  );

router.route('/:articleId/likes')
  .post(
    requireAuth,
    validate({ params: articleIdParams }),
    asyncHandler(articleController.like),
  )
  .delete(
    requireAuth,
    validate({ params: articleIdParams }),
    asyncHandler(articleController.unlike),
  );

router.route('/:articleId/comments')
  .get(
    optionalAuth,
    validate({ params: articleIdParams, query: commentsQuery }),
    asyncHandler(comments.list),
  )
  .post(
    requireAuth,
    validate({ params: articleIdParams, body: commentBody }),
    asyncHandler(comments.create),
  );

export default router;
