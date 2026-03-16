-- Migration Fase 5.1: Especialista WhatsApp por domínio
-- Adiciona campos de especialista responsável em nexus.domains

ALTER TABLE nexus.domains
  ADD COLUMN IF NOT EXISTS expert_name           TEXT,
  ADD COLUMN IF NOT EXISTS expert_whatsapp       TEXT,        -- número no formato internacional, ex: 5511999998888
  ADD COLUMN IF NOT EXISTS expert_fallback_message TEXT;      -- mensagem padrão enviada ao especialista

COMMENT ON COLUMN nexus.domains.expert_name             IS 'Nome do especialista responsável por este domínio';
COMMENT ON COLUMN nexus.domains.expert_whatsapp         IS 'Número WhatsApp do especialista (formato internacional sem +)';
COMMENT ON COLUMN nexus.domains.expert_fallback_message IS 'Mensagem padrão de fallback enviada ao especialista via WhatsApp';
