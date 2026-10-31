BEGIN;

ALTER TABLE public.amc_site_entry
ADD COLUMN IF NOT EXISTS scada_make text;

ALTER TABLE public.amc_site_entry
ADD COLUMN IF NOT EXISTS plc_make text;

COMMIT;
