ALTER TABLE users
  ADD COLUMN email_verified_at TIMESTAMPTZ,
  ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;

-- Google already attested ownership of these email addresses.
UPDATE users
SET email_verified_at = created_at
WHERE google_id IS NOT NULL
  AND email_verified_at IS NULL;

ALTER TABLE users
  ADD CONSTRAINT users_auth_version_check CHECK (auth_version >= 0);
