ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.payment_accounts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DROP INDEX IF EXISTS public.uniq_payment_methods_user_name;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_methods_user_name
ON public.payment_methods (user_id, LOWER(name))
WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS public.uniq_payment_accounts_user_name;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_accounts_user_name
ON public.payment_accounts (user_id, LOWER(name))
WHERE deleted_at IS NULL;
