-- Add auth subject/provider columns to support non-UUID identity provider subjects (e.g., Clerk).

ALTER TABLE user_account
  ADD COLUMN IF NOT EXISTS auth_provider TEXT;

ALTER TABLE user_account
  ADD COLUMN IF NOT EXISTS auth_subject TEXT;

-- Backfill existing rows (legacy: user_account.id was the auth provider subject UUID)
UPDATE user_account
SET auth_subject = id::text
WHERE auth_subject IS NULL;

-- Ensure uniqueness for fast lookup and to prevent duplicates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'ux_user_account_auth_subject'
  ) THEN
    CREATE UNIQUE INDEX ux_user_account_auth_subject ON user_account(auth_subject);
  END IF;
END $$;
