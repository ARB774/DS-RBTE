-- Lucia v3 generates 40-character base32 session IDs. The legacy UUID
-- column rejects them during login before the session cookie can be set.

BEGIN;

ALTER TABLE sessions
  ALTER COLUMN id TYPE TEXT
  USING id::text;

COMMIT;
