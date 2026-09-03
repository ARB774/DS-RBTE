-- Upgrade the legacy Lucia session table to the Lucia v3 adapter contract.

BEGIN;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sessions'
      AND column_name = 'idle_expires'
  ) THEN
    EXECUTE 'UPDATE sessions SET expires_at = idle_expires WHERE expires_at IS NULL';
  END IF;
END
$$;

-- There should be no sessions during the pilot repair. This fallback also
-- makes the migration safe if a partial legacy row exists.
UPDATE sessions
SET expires_at = now() + interval '30 days'
WHERE expires_at IS NULL;

ALTER TABLE sessions ALTER COLUMN expires_at SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sessions'
      AND column_name = 'active_expires'
  ) THEN
    ALTER TABLE sessions ALTER COLUMN active_expires DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sessions'
      AND column_name = 'idle_expires'
  ) THEN
    ALTER TABLE sessions ALTER COLUMN idle_expires DROP NOT NULL;
  END IF;
END
$$;

COMMIT;
