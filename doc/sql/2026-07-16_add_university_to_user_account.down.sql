BEGIN;

ALTER TABLE public.user_account
    DROP CONSTRAINT IF EXISTS user_account_university_check,
    DROP COLUMN IF EXISTS university_name,
    DROP COLUMN IF EXISTS university_code;

COMMIT;
