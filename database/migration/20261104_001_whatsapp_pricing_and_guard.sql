-- Dados de cobranca enviados pela Meta nos webhooks de status (objeto "pricing").
-- Desde 01/10/2026 mensagens de servico sao cobradas apos 1.000/mes por numero;
-- estas colunas permitem medir quantas mensagens foram de fato cobradas.
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS pricing_billable BOOLEAN,
  ADD COLUMN IF NOT EXISTS pricing_category VARCHAR(32),
  ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(32),
  ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(16);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_billable_sent_at
ON public.whatsapp_messages (sent_at)
WHERE pricing_billable = TRUE;

-- Usado na recuperacao de mensagens presas em "processing" apos reinicio.
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_processing
ON public.whatsapp_messages (updated_at)
WHERE direction = 'incoming' AND status = 'processing';
