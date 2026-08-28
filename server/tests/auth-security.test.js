import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { hasCurrentAuthVersion, readAuthVersion } from '../utils/auth-version.js';
import { verifyPassword } from '../utils/password-auth.js';
import { purgeExpiredRefreshSessions } from '../services/refresh-session-service.js';

test('new access and refresh JWTs carry the account auth version', async () => {
  process.env.JWT_ACCESS_SECRET = 'access-test-secret-that-is-at-least-32-characters';
  process.env.JWT_REFRESH_SECRET = 'refresh-test-secret-that-is-at-least-32-characters';
  const {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
  } = await import('../utils/tokens.js');

  const accessToken = signAccessToken({
    id: 7,
    email: 'user@example.com',
    nickname: 'user',
    authVersion: 3,
  });
  const refreshToken = signRefreshToken({
    userId: 7,
    sessionId: 'session-id',
    familyId: 'family-id',
    authVersion: 3,
    expiresInSeconds: 60,
  });

  assert.equal(verifyAccessToken(accessToken).ver, 3);
  assert.equal(verifyRefreshToken(refreshToken).ver, 3);
});

test('auth versions invalidate old tokens while accepting legacy version zero', () => {
  assert.equal(readAuthVersion(undefined), 0);
  assert.equal(hasCurrentAuthVersion({}, { authVersion: 0 }), true);
  assert.equal(hasCurrentAuthVersion({ ver: 2 }, { authVersion: 2 }), true);
  assert.equal(hasCurrentAuthVersion({ ver: 1 }, { authVersion: 2 }), false);
  assert.equal(hasCurrentAuthVersion({ ver: -1 }, { authVersion: 0 }), false);
  assert.equal(hasCurrentAuthVersion({ ver: 'invalid' }, { authVersion: 0 }), false);
});

test('password verification always uses bcrypt and rejects the dummy credential', async () => {
  const encryptedPassword = await bcrypt.hash('correct-password', 4);
  assert.equal(await verifyPassword('correct-password', encryptedPassword), true);
  assert.equal(await verifyPassword('wrong-password', encryptedPassword), false);
  assert.equal(await verifyPassword('panda-dummy-credential', null), false);
});

test('expired refresh sessions are deleted in a bounded batch', async () => {
  const calls = { find: null, remove: null };
  const client = {
    refreshSession: {
      async findMany(args) {
        calls.find = args;
        return [{ id: 'one' }, { id: 'two' }];
      },
      async deleteMany(args) {
        calls.remove = args;
        return { count: 2 };
      },
    },
  };
  const now = new Date('2026-08-28T12:00:00.000Z');

  const count = await purgeExpiredRefreshSessions({ now, batchSize: 5_000, client });

  assert.equal(count, 2);
  assert.equal(calls.find.take, 500);
  assert.equal(calls.find.where.expiresAt.lt.toISOString(), '2026-08-28T11:59:00.000Z');
  assert.deepEqual(calls.remove.where.id.in, ['one', 'two']);
  assert.equal(
    calls.remove.where.expiresAt.lt.toISOString(),
    calls.find.where.expiresAt.lt.toISOString(),
  );
});

test('refresh-session purge skips delete when no expired rows exist', async () => {
  let deleteCalled = false;
  const client = {
    refreshSession: {
      async findMany() { return []; },
      async deleteMany() { deleteCalled = true; return { count: 0 }; },
    },
  };

  assert.equal(await purgeExpiredRefreshSessions({ client }), 0);
  assert.equal(deleteCalled, false);
});
