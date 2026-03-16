-- Migration Fase 6: Blocklist de números WhatsApp
-- Números nesta tabela são ignorados pelo agente n8n (não recebem resposta automática)

CREATE TABLE IF NOT EXISTS nexus.whatsapp_ignored_numbers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number      TEXT NOT NULL UNIQUE,           -- formato internacional sem +, ex: 5511999998888
  label       TEXT,                           -- descrição/apelido opcional
  reason      TEXT,                           -- motivo do bloqueio
  added_by    UUID REFERENCES nexus.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ignored_number ON nexus.whatsapp_ignored_numbers(number);

COMMENT ON TABLE nexus.whatsapp_ignored_numbers IS 'Números de grupos/contatos WhatsApp que devem ser ignorados pelo agente n8n';
COMMENT ON COLUMN nexus.whatsapp_ignored_numbers.number IS 'Número no formato internacional sem + (ex: 5511999998888 ou group id)';
