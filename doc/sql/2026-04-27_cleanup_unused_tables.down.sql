-- Rollback script for 2026-04-27_cleanup_unused_tables.up.sql
-- Recreates dropped tables and restores data from `cleanup_backup` if available.

BEGIN;

CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    workshop_id BIGINT NULL,
    credit_amount INTEGER NOT NULL,
    transaction_type VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

ALTER TABLE public.credit_transactions
    DROP CONSTRAINT IF EXISTS fk_credit_transactions_user;
ALTER TABLE public.credit_transactions
    ADD CONSTRAINT fk_credit_transactions_user
    FOREIGN KEY (user_id) REFERENCES public.user_account(id);

ALTER TABLE public.credit_transactions
    DROP CONSTRAINT IF EXISTS fk_credit_transactions_workshop;
ALTER TABLE public.credit_transactions
    ADD CONSTRAINT fk_credit_transactions_workshop
    FOREIGN KEY (workshop_id) REFERENCES public.workshops(id);

CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID NULL,
    action VARCHAR(255) NOT NULL,
    target_entity VARCHAR(255) NULL,
    target_id VARCHAR(255) NULL,
    details JSONB NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

ALTER TABLE public.audit_log
    DROP CONSTRAINT IF EXISTS fk_audit_log_actor;
ALTER TABLE public.audit_log
    ADD CONSTRAINT fk_audit_log_actor
    FOREIGN KEY (actor_id) REFERENCES public.user_account(id);

CREATE TABLE IF NOT EXISTS public.review (
    id BIGSERIAL PRIMARY KEY,
    workshop_id BIGINT NOT NULL,
    reviewer_id UUID NOT NULL,
    host_id UUID NOT NULL,
    rating NUMERIC(2, 1) NOT NULL,
    comment VARCHAR(255) NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

ALTER TABLE public.review
    DROP CONSTRAINT IF EXISTS fk_review_reviewer;
ALTER TABLE public.review
    ADD CONSTRAINT fk_review_reviewer
    FOREIGN KEY (reviewer_id) REFERENCES public.user_account(id);

ALTER TABLE public.review
    DROP CONSTRAINT IF EXISTS fk_review_host;
ALTER TABLE public.review
    ADD CONSTRAINT fk_review_host
    FOREIGN KEY (host_id) REFERENCES public.user_account(id);

CREATE TABLE IF NOT EXISTS public.rating_summary (
    user_id UUID PRIMARY KEY,
    average_rating NUMERIC(3, 2) NULL,
    review_count INTEGER NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NULL
);

ALTER TABLE public.rating_summary
    DROP CONSTRAINT IF EXISTS fk_rating_summary_user;
ALTER TABLE public.rating_summary
    ADD CONSTRAINT fk_rating_summary_user
    FOREIGN KEY (user_id) REFERENCES public.user_account(id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cleanup_backup' AND table_name = 'credit_transactions_backup'
    ) THEN
        TRUNCATE TABLE public.credit_transactions RESTART IDENTITY;
        INSERT INTO public.credit_transactions
        SELECT * FROM cleanup_backup.credit_transactions_backup;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cleanup_backup' AND table_name = 'audit_log_backup'
    ) THEN
        TRUNCATE TABLE public.audit_log RESTART IDENTITY;
        INSERT INTO public.audit_log
        SELECT * FROM cleanup_backup.audit_log_backup;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cleanup_backup' AND table_name = 'review_backup'
    ) THEN
        TRUNCATE TABLE public.review RESTART IDENTITY;
        INSERT INTO public.review
        SELECT * FROM cleanup_backup.review_backup;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cleanup_backup' AND table_name = 'rating_summary_backup'
    ) THEN
        TRUNCATE TABLE public.rating_summary;
        INSERT INTO public.rating_summary
        SELECT * FROM cleanup_backup.rating_summary_backup;
    END IF;
END $$;

COMMIT;
