BEGIN;

ALTER TABLE public.user_account
    DROP COLUMN IF EXISTS university;

COMMIT;
