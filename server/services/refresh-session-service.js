import prisma from '../config/prisma.js';

const PURGE_BATCH_SIZE = 500;
const IDLE_PURGE_INTERVAL_MS = 60 * 60 * 1000;
const EXPIRY_SAFETY_WINDOW_MS = 60 * 1000;

let purgeInFlight = null;
let nextPurgeAt = 0;

export async function purgeExpiredRefreshSessions({
  now = new Date(),
  batchSize = PURGE_BATCH_SIZE,
  client = prisma,
} = {}) {
  const take = Math.min(Math.max(Number(batchSize) || PURGE_BATCH_SIZE, 1), PURGE_BATCH_SIZE);
  const expiredBefore = new Date(now.getTime() - EXPIRY_SAFETY_WINDOW_MS);
  const expired = await client.refreshSession.findMany({
    where: { expiresAt: { lt: expiredBefore } },
    orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
    take,
    select: { id: true },
  });
  if (!expired.length) return 0;

  const result = await client.refreshSession.deleteMany({
    where: {
      id: { in: expired.map(({ id }) => id) },
      expiresAt: { lt: expiredBefore },
    },
  });
  return result.count;
}

export function scheduleRefreshSessionPurge() {
  const now = Date.now();
  if (purgeInFlight || now < nextPurgeAt) return;

  // When a full batch is removed, allow the next auth request to continue
  // draining backlog. Once caught up, probe at most once per hour.
  nextPurgeAt = Number.POSITIVE_INFINITY;
  purgeInFlight = purgeExpiredRefreshSessions()
    .then((count) => {
      nextPurgeAt = count >= PURGE_BATCH_SIZE ? 0 : Date.now() + IDLE_PURGE_INTERVAL_MS;
    })
    .catch((error) => {
      nextPurgeAt = Date.now() + IDLE_PURGE_INTERVAL_MS;
      console.error('Expired refresh-session cleanup failed.', error);
    })
    .finally(() => {
      purgeInFlight = null;
    });
}
