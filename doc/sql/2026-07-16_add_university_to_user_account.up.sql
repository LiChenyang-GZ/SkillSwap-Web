BEGIN;

ALTER TABLE public.user_account
    ADD COLUMN IF NOT EXISTS university varchar(100);

COMMIT;
