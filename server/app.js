import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import prisma from './config/prisma.js';
import openapiSpecification from './docs/openapi.js';
import errorHandler from './middleware/error-handler.js';
import notFound from './middleware/not-found.js';
import articleRouter from './routes/article-routes.js';
import authRouter from './routes/auth-routes.js';
import commentRouter from './routes/comment-routes.js';
import productRouter from './routes/product-routes.js';
import uploadRouter from './routes/upload-routes.js';
import userRouter from './routes/user-routes.js';
import asyncHandler from './utils/async-handler.js';

function corsOrigin(origin, callback) {
  if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
  const error = new Error('허용되지 않은 Origin입니다.');
  error.status = 403;
  return callback(error);
}

async function health(_req, res) {
  await prisma.$queryRaw`SELECT 1`;
  res.status(200).json({ status: 'ok', database: 'ok' });
}

export function createServerApp({ nextHandler } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use('/uploads', express.static(path.resolve(env.uploadDirectory), {
    immutable: true,
    maxAge: '7d',
    index: false,
  }));

  app.get('/api/docs.json', (_req, res) => res.status(200).json(openapiSpecification));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification, {
    customSiteTitle: 'Panda Market API Docs',
  }));

  // app.route() intentionally aggregates the same health resource methods.
  app.route('/api/health')
    .get(asyncHandler(health))
    .head(asyncHandler(health));

  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/uploads', uploadRouter);
  app.use('/api/products', productRouter);
  app.use('/api/articles', articleRouter);
  app.use('/api/comments', commentRouter);
  app.use('/api', notFound);

  // Express passes its `next` callback as a third argument. Next's request
  // handler interprets that position as a parsed URL, so wrap it explicitly.
  if (nextHandler) app.all('*', (req, res) => nextHandler(req, res));
  app.use(errorHandler);
  return app;
}

export default createServerApp;
