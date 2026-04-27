-- Cleanup unused tables after code-level entity removal.
-- This script creates full-table backups into schema `cleanup_backup`,
-- then drops unused tables in public schema.

BEGIN;

CREATE SCHEMA IF NOT EXISTS cleanup_backup;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'credit_transactions'
    ) THEN
        CREATE TABLE IF NOT EXISTS cleanup_backup.credit_transactions_backup
            (LIKE public.credit_transactions INCLUDING ALL);
        TRUNCATE TABLE cleanup_backup.credit_transactions_backup;
        INSERT INTO cleanup_backup.credit_transactions_backup
        SELECT * FROM public.credit_transactions;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'audit_log'
    ) THEN
        CREATE TABLE IF NOT EXISTS cleanup_backup.audit_log_backup
            (LIKE public.audit_log INCLUDING ALL);
        TRUNCATE TABLE cleanup_backup.audit_log_backup;
        INSERT INTO cleanup_backup.audit_log_backup
        SELECT * FROM public.audit_log;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'review'
    ) THEN
        CREATE TABLE IF NOT EXISTS cleanup_backup.review_backup
            (LIKE public.review INCLUDING ALL);
        TRUNCATE TABLE cleanup_backup.review_backup;
        INSERT INTO cleanup_backup.review_backup
        SELECT * FROM public.review;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'rating_summary'
    ) THEN
        CREATE TABLE IF NOT EXISTS cleanup_backup.rating_summary_backup
            (LIKE public.rating_summary INCLUDING ALL);
        TRUNCATE TABLE cleanup_backup.rating_summary_backup;
        INSERT INTO cleanup_backup.rating_summary_backup
        SELECT * FROM public.rating_summary;
    END IF;
END $$;

DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.review CASCADE;
DROP TABLE IF EXISTS public.rating_summary CASCADE;

COMMIT;
