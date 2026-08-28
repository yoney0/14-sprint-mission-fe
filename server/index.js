import next from 'next';
import { createServerApp } from './app.js';
import { assertRuntimeConfig, env } from './config/env.js';
import prisma from './config/prisma.js';
import { pruneAllAbandonedUploads } from './services/upload-service.js';

assertRuntimeConfig();

const dev = env.nodeEnv !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const nextApp = next({ dev, hostname, port: env.port });
await nextApp.prepare();

const app = createServerApp({ nextHandler: nextApp.getRequestHandler() });
const server = app.listen(env.port, hostname, () => {
  console.log(`Panda Market listening on http://${hostname}:${env.port}`);
  console.log(`Swagger UI: http://${hostname}:${env.port}/api/docs`);
});

let uploadSweepRunning = false;
async function runUploadSweep() {
  if (uploadSweepRunning) return;
  uploadSweepRunning = true;
  try {
    const removed = await pruneAllAbandonedUploads();
    if (removed) console.log(`Removed ${removed} abandoned upload(s).`);
  } catch (error) {
    console.error('Upload maintenance failed:', error);
  } finally {
    uploadSweepRunning = false;
  }
}

void runUploadSweep();
const uploadSweepTimer = setInterval(
  runUploadSweep,
  env.uploadSweepIntervalSeconds * 1000,
);
uploadSweepTimer.unref();

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  clearInterval(uploadSweepTimer);
  server.close(async () => {
    await prisma.$disconnect();
    if (typeof nextApp.close === 'function') await nextApp.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
