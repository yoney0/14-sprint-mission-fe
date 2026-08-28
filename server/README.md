# Panda Market backend

The custom server in `server/index.js` serves both the Next application and an
Express API under `/api`. Prisma/PostgreSQL is the canonical persistence layer.

## Local setup

1. Use the Node version in `.nvmrc` and install dependencies.
2. Copy `.env.example` to `.env`, replace both JWT secrets, and set `DATABASE_URL`.
3. For a new/empty database, run `npm run db:migrate` and optionally `npm run db:seed`.
4. Run `npm run dev` and open `/api/docs` for Swagger UI.

For an existing Sprint 08 database created by `server/db/schema.sql`, back it up
and baseline it before deploying the additive Sprint 09 migrations:

```sh
npx prisma migrate resolve --applied 20260827080000_sprint_08_baseline
npm run db:migrate
```

Do not mark either Sprint 09 migration as applied. They add a non-login legacy user,
backfills existing product/article/comment ownership, migrates each old `image`
value into the ordered image tables, apply ownership constraints, and add the
authentication-version fields used for token invalidation.
Inspect rows assigned to `legacy@panda.local` afterward.

The SQL migration intentionally keeps `products.tags` as `NOT NULL` even though
Prisma models PostgreSQL scalar lists with a default; application writes always
send an array, and the database constraint prevents legacy null values.

## Authentication

Access tokens are short-lived JWTs. Refresh tokens are rotated on every refresh,
stored only as SHA-256 hashes, extended as a sliding session, and bounded by an
absolute lifetime. Reuse of a rotated token revokes its token family. The browser
keeps refresh tokens only in a same-site HttpOnly cookie; they are not returned to
frontend JavaScript or persisted in local storage. APIs accept Bearer access
tokens and same-site HttpOnly access cookies.

Access and refresh JWTs carry an account authentication version. A verified
Google identity can safely reclaim an unverified local email reservation: the
password is removed, all prior refresh sessions are revoked, and older access
tokens immediately fail version validation. Expired refresh-session rows are
deleted in bounded batches during authentication traffic.

Google OAuth remains disabled until `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
and `GOOGLE_CALLBACK_URL` are configured.

The bundled rate-limit store is process-local. Use a shared Redis-compatible
store before running multiple API instances so limits apply across the fleet.

## Upload storage

`POST /api/uploads/images` accepts at most three files in the `images` field.
Files are size-, MIME-, and signature-checked before paths are returned. The
route requires authentication, applies per-IP rate limiting and per-user disk
quotas, and prunes abandoned uploads after the configured orphan lifetime. A
startup/periodic global sweep also removes abandoned files from users who never
upload again; tune it with `UPLOAD_SWEEP_INTERVAL_SECONDS`.
Removing an uploaded image from a resource also removes an unreferenced file. The
default `public/uploads` directory is suitable for local or persistent-server
deployments only. Serverless/ephemeral deployments must mount persistent storage
or replace the disk storage adapter with object storage.
