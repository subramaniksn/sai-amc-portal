BEGIN;

ALTER TABLE public.invoice_schedule
ADD COLUMN IF NOT EXISTS po_date date;

COMMIT;
