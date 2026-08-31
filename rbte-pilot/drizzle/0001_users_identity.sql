-- Bring already deployed databases in line with db/schema.ts.
-- The original 0000 migration omitted users.email and users.name.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Preserve any legacy rows before enforcing NOT NULL.
UPDATE users
SET email = 'legacy-' || id::text || '@rbte.local'
WHERE email IS NULL OR btrim(email) = '';

UPDATE users
SET name = 'Legacy user ' || left(id::text, 8)
WHERE name IS NULL OR btrim(name) = '';

ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

COMMIT;
