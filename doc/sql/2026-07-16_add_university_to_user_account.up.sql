BEGIN;

ALTER TABLE public.user_account
    ADD COLUMN IF NOT EXISTS university_code varchar(20),
    ADD COLUMN IF NOT EXISTS university_name varchar(100);

ALTER TABLE public.user_account
    DROP CONSTRAINT IF EXISTS user_account_university_check;

ALTER TABLE public.user_account
    ADD CONSTRAINT user_account_university_check CHECK (
        (university_code IS NULL AND university_name IS NULL)
        OR (university_code IN ('USYD', 'UNSW', 'UTS') AND university_name IS NULL)
        OR (
            university_code = 'OTHER'
            AND char_length(btrim(university_name)) BETWEEN 2 AND 100
        )
    );

COMMIT;
