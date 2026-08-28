import { Router } from 'express';
import { me } from '../controllers/auth-controller.js';
import { requireAuth } from '../middleware/auth.js';
import asyncHandler from '../utils/async-handler.js';

const router = Router();

router.get('/me', requireAuth, asyncHandler(me));

export default router;
