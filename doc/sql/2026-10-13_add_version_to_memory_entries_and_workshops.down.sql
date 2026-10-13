BEGIN;

ALTER TABLE public.workshops
    DROP COLUMN IF EXISTS version;

ALTER TABLE public.memory_entries
    DROP COLUMN IF EXISTS version;

COMMIT;
