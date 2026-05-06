CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES public.user_whatsapp_contacts(id) ON DELETE CASCADE,
  current_intent VARCHAR(64),
  current_step VARCHAR(64),
  pending_question TEXT,
  slot_state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_inbound_message_id VARCHAR(128),
  last_outbound_message_id VARCHAR(128),
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  customer_care_window_expires_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_conversation_sessions_user_id_key UNIQUE (user_id),
  CONSTRAINT whatsapp_conversation_sessions_contact_id_key UNIQUE (contact_id)
);

CREATE TABLE IF NOT EXISTS public.whatsapp_llm_audits (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  contact_id INTEGER REFERENCES public.user_whatsapp_contacts(id) ON DELETE SET NULL,
  session_id BIGINT REFERENCES public.whatsapp_conversation_sessions(id) ON DELETE SET NULL,
  model_name VARCHAR(80) NOT NULL,
  input_text TEXT NOT NULL,
  prompt_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  structured_output JSONB,
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_window
ON public.whatsapp_conversation_sessions (customer_care_window_expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_llm_audits_session
ON public.whatsapp_llm_audits (session_id, created_at DESC);
