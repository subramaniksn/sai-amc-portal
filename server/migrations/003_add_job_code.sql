BEGIN;

ALTER TABLE public.amc_site_entry
ADD COLUMN IF NOT EXISTS job_code text;

COMMIT;
