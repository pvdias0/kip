CREATE TABLE IF NOT EXISTS public.whatsapp_channel_config (
  id SERIAL PRIMARY KEY,
  waba_id VARCHAR(32) NOT NULL UNIQUE,
  phone_number_id VARCHAR(32) NOT NULL UNIQUE,
  business_phone_number VARCHAR(32) NOT NULL,
  display_name VARCHAR(255),
  app_id VARCHAR(32),
  webhook_callback_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'configured',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_whatsapp_contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number VARCHAR(32) NOT NULL,
  phone_number_e164 VARCHAR(32) NOT NULL UNIQUE,
  opted_in BOOLEAN NOT NULL DEFAULT FALSE,
  opted_in_at TIMESTAMPTZ,
  opt_in_source VARCHAR(80),
  opt_out_at TIMESTAMPTZ,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_whatsapp_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  receive_support_messages BOOLEAN NOT NULL DEFAULT TRUE,
  receive_transactional_messages BOOLEAN NOT NULL DEFAULT TRUE,
  receive_weekly_summary BOOLEAN NOT NULL DEFAULT FALSE,
  receive_budget_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  language_code VARCHAR(16) NOT NULL DEFAULT 'pt_BR',
  category VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  template_id VARCHAR(64),
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_templates_name_language_key UNIQUE (name, language_code)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  contact_id INTEGER REFERENCES public.user_whatsapp_contacts(id) ON DELETE SET NULL,
  direction VARCHAR(16) NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'text',
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  phone_number VARCHAR(32),
  meta_message_id VARCHAR(128) UNIQUE,
  related_message_id VARCHAR(128),
  template_name VARCHAR(128),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_event JSONB,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  object_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_whatsapp_contacts_phone_e164
ON public.user_whatsapp_contacts (phone_number_e164);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id
ON public.whatsapp_messages (user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_id
ON public.whatsapp_messages (contact_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_message_id
ON public.whatsapp_messages (meta_message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_received_at
ON public.whatsapp_webhook_events (received_at DESC);
