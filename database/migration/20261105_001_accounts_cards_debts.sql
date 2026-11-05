-- Visao geral financeira: saldo por conta, fatura de cartao, transferencias e dividas.

-- Contas ganham saldo inicial e dados de cartao de credito.
ALTER TABLE public.payment_accounts
  ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS closing_day SMALLINT CHECK (closing_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31);

-- Formas de pagamento que geram fatura (credito) em vez de sair do saldo na hora.
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS is_credit BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.payment_methods
SET is_credit = TRUE
WHERE is_default = TRUE
  AND LOWER(name) IN ('crédito', 'credito');

-- Saldo inicial do dinheiro que nao esta em nenhuma conta (lancamentos sem conta).
-- card_tracking_since: compras no credito a partir desta data viram fatura;
-- as anteriores sao tratadas como ja pagas (mantem o historico de quem ja usava o KIP).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_tracking_since DATE NOT NULL DEFAULT CURRENT_DATE;

UPDATE public.users
SET card_tracking_since = date_trunc('month', CURRENT_DATE)::date
WHERE card_tracking_since = CURRENT_DATE;

-- Transferencias entre contas e pagamentos de fatura (nao contam como ganho/gasto).
CREATE TABLE IF NOT EXISTS public.account_transfers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('transfer', 'card_payment')),
  from_account_id INTEGER REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  to_account_id INTEGER REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_transfers_user_date
ON public.account_transfers (user_id, date DESC);

-- Dividas: emprestimos, financiamentos, compras parceladas e outras.
CREATE TABLE IF NOT EXISTS public.debts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'loan'
    CHECK (kind IN ('loan', 'financing', 'installment', 'other')),
  creditor VARCHAR(120),
  -- quanto faltava pagar quando a divida foi cadastrada no KIP
  amount_due NUMERIC(12,2) NOT NULL CHECK (amount_due > 0),
  installment_amount NUMERIC(12,2) CHECK (installment_amount > 0),
  installments_total SMALLINT CHECK (installments_total > 0),
  installments_paid_before SMALLINT NOT NULL DEFAULT 0 CHECK (installments_paid_before >= 0),
  due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes VARCHAR(255),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts (user_id);

-- Pagamento de parcela = gasto normal ligado a divida.
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS debt_id INTEGER REFERENCES public.debts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entries_debt_id
ON public.entries (debt_id) WHERE debt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entries_user_date
ON public.entries (user_id, date);
