-- Sprint Mission 09 additive migration.
-- The preceding Sprint 08 baseline is executed on fresh databases and is marked
-- as applied (without executing it) when adopting an existing raw-SQL database.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  nickname VARCHAR(20) NOT NULL,
  image TEXT,
  encrypted_password TEXT,
  google_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key ON users(google_id);

ALTER TABLE products ALTER COLUMN name TYPE VARCHAR(30);
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_description_check;
ALTER TABLE products ADD CONSTRAINT products_description_check CHECK (
  char_length(trim(description)) >= 10
  AND char_length(trim(description)) <= 1000
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS owner_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS owner_id INTEGER;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_likes_count_check') THEN
    ALTER TABLE products
      ADD CONSTRAINT products_likes_count_check CHECK (likes_count >= 0);
  END IF;
END $$;

-- Legacy rows receive a non-login system owner before ownership becomes required.
INSERT INTO users (email, nickname, image, encrypted_password, created_at, updated_at)
VALUES ('legacy@panda.local', '기존 사용자', NULL, NULL, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

UPDATE products
SET owner_id = (SELECT id FROM users WHERE email = 'legacy@panda.local')
WHERE owner_id IS NULL;

UPDATE articles
SET owner_id = (SELECT id FROM users WHERE email = 'legacy@panda.local')
WHERE owner_id IS NULL;

UPDATE comments
SET author_id = (SELECT id FROM users WHERE email = 'legacy@panda.local')
WHERE author_id IS NULL;

ALTER TABLE products ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE articles ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE comments ALTER COLUMN author_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_owner_id_fkey') THEN
    ALTER TABLE products
      ADD CONSTRAINT products_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_owner_id_fkey') THEN
    ALTER TABLE articles
      ADD CONSTRAINT articles_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_author_id_fkey') THEN
    ALTER TABLE comments
      ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0 AND position < 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_images_product_id_position_key UNIQUE (product_id, position)
);

INSERT INTO product_images (product_id, url, position)
SELECT id, image, 0
FROM products
WHERE image IS NOT NULL AND trim(image) <> ''
ON CONFLICT (product_id, position) DO NOTHING;

CREATE TABLE IF NOT EXISTS article_images (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0 AND position < 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT article_images_article_id_position_key UNIQUE (article_id, position)
);

INSERT INTO article_images (article_id, url, position)
SELECT id, image, 0
FROM articles
WHERE image IS NOT NULL AND trim(image) <> ''
ON CONFLICT (article_id, position) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_likes_pkey PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS article_likes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT article_likes_pkey PRIMARY KEY (user_id, article_id)
);

CREATE TABLE IF NOT EXISTS refresh_sessions (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  absolute_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS refresh_sessions_token_hash_key ON refresh_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_products_likes ON products(likes_count DESC, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_articles_likes ON articles(likes_count DESC, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_articles_owner_id ON articles(owner_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_cursor ON comments(product_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_article_comments_cursor ON comments(article_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON article_images(article_id);
CREATE INDEX IF NOT EXISTS idx_product_likes_product_id ON product_likes(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON article_likes(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_id ON refresh_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_family_id ON refresh_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_expires_at ON refresh_sessions(expires_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_articles_updated_at ON articles;
CREATE TRIGGER trg_articles_updated_at BEFORE UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
