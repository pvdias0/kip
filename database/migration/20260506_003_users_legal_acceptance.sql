ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_of_service_accepted_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_of_service_version VARCHAR(32);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(32);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS legal_acceptance_ip VARCHAR(64);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS legal_acceptance_user_agent VARCHAR(255);
