CREATE TABLE IF NOT EXISTS public.payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  accounts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.payment_method_accounts (
  payment_method_id INTEGER NOT NULL REFERENCES public.payment_methods(id) ON DELETE CASCADE,
  payment_account_id INTEGER NOT NULL REFERENCES public.payment_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_method_id, payment_account_id)
);

ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS accounts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS payment_method_id INTEGER REFERENCES public.payment_methods(id) ON DELETE SET NULL;

ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS payment_account_id INTEGER REFERENCES public.payment_accounts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_methods_user_name
ON public.payment_methods (user_id, LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS uniq_payment_accounts_user_name
ON public.payment_accounts (user_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_entries_payment_method_id
ON public.entries (payment_method_id);

CREATE INDEX IF NOT EXISTS idx_entries_payment_account_id
ON public.entries (payment_account_id);

CREATE INDEX IF NOT EXISTS idx_payment_method_accounts_account_id
ON public.payment_method_accounts (payment_account_id);

INSERT INTO public.payment_methods (user_id, name, accounts_enabled, is_default)
SELECT
  u.id,
  defaults.name,
  defaults.accounts_enabled,
  TRUE
FROM public.users u
CROSS JOIN (
  VALUES
    ('Crédito', TRUE),
    ('Débito', TRUE),
    ('Pix', TRUE),
    ('Dinheiro', FALSE),
    ('Transferência', FALSE),
    ('Boleto', FALSE)
) AS defaults(name, accounts_enabled)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.payment_methods pm
  WHERE pm.user_id = u.id
    AND LOWER(pm.name) = LOWER(defaults.name)
);
