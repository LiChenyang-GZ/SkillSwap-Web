-- Rollback for auth subject/provider columns.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'ux_user_account_auth_subject'
  ) THEN
    DROP INDEX ux_user_account_auth_subject;
  END IF;
END $$;

ALTER TABLE user_account
  DROP COLUMN IF EXISTS auth_subject;

ALTER TABLE user_account
  DROP COLUMN IF EXISTS auth_provider;
