import { Router } from 'express';
import * as authController from '../controllers/auth-controller.js';
import {
  oauthRateLimit,
  refreshRateLimit,
  signinRateLimit,
  signupRateLimit,
} from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import asyncHandler from '../utils/async-handler.js';
import {
  oauthCallbackQuery,
  oauthStartQuery,
  refreshBody,
  signinBody,
  signupBody,
} from '../validators/schemas.js';

const router = Router();

router.post('/signup', signupRateLimit, validate({ body: signupBody }), asyncHandler(authController.signup));
router.post('/signin', signinRateLimit, validate({ body: signinBody }), asyncHandler(authController.signin));
router.post('/refresh', refreshRateLimit, validate({ body: refreshBody }), asyncHandler(authController.refresh));
router.post('/logout', validate({ body: refreshBody }), asyncHandler(authController.logout));
router.get('/google', oauthRateLimit, validate({ query: oauthStartQuery }), asyncHandler(authController.googleStart));
router.get(
  '/google/callback',
  oauthRateLimit,
  validate({ query: oauthCallbackQuery }),
  asyncHandler(authController.googleCallback),
);

export default router;
