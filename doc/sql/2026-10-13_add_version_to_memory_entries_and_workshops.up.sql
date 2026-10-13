BEGIN;

-- Optimistic locking: every admin write must carry the version it read,
-- and Hibernate's @Version bumps this column on each committed update.
ALTER TABLE public.memory_entries
    ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;

ALTER TABLE public.workshops
    ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;

COMMIT;
