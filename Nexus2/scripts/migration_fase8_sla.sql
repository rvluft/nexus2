-- Migration Fase 8: SLA de Atendimento WhatsApp
-- Tickets, eventos, configuração de SLA por domínio

-- Sequência para número de ticket humanamente legível
CREATE SEQUENCE IF NOT EXISTS nexus.ticket_seq START 1;

CREATE TABLE IF NOT EXISTS nexus.support_tickets (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number              TEXT NOT NULL UNIQUE DEFAULT ('T-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('nexus.ticket_seq')::TEXT, 5, '0')),
  domain_id                  UUID REFERENCES nexus.domains(id),
  -- Especialista (pode ser nulo se não atribuído ainda)
  specialist_name            TEXT,
  specialist_whatsapp        TEXT,
  -- Solicitante (número WhatsApp que abriu o ticket)
  requester_number           TEXT NOT NULL,
  requester_name             TEXT,
  -- Conteúdo
  subject                    TEXT,
  message_preview            TEXT,   -- primeiros 500 chars da mensagem
  -- Status: open → in_progress → resolved → closed
  status                     TEXT NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open','awaiting_specialist','in_progress','resolved','closed')),
  priority                   TEXT NOT NULL DEFAULT 'normal'
                               CHECK (priority IN ('low','normal','high','urgent')),
  -- SLA timestamps
  opened_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_response_at          TIMESTAMPTZ,   -- primeira resposta do especialista
  resolved_at                TIMESTAMPTZ,
  closed_at                  TIMESTAMPTZ,
  -- SLA durations (em minutos, preenchidos ao resolver/fechar)
  first_response_minutes     INT GENERATED ALWAYS AS (
    CASE WHEN first_response_at IS NOT NULL
         THEN EXTRACT(EPOCH FROM (first_response_at - opened_at)) / 60
    END
  ) STORED,
  resolution_minutes         INT GENERATED ALWAYS AS (
    CASE WHEN resolved_at IS NOT NULL
         THEN EXTRACT(EPOCH FROM (resolved_at - opened_at)) / 60
    END
  ) STORED,
  -- SLA breach flags (preenchidos via trigger ou backend)
  first_response_breached    BOOLEAN DEFAULT false,
  resolution_breached        BOOLEAN DEFAULT false,
  -- Metadata
  source                     TEXT DEFAULT 'whatsapp',  -- canal de origem
  metadata                   JSONB DEFAULT '{}',
  created_by                 UUID REFERENCES nexus.users(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus.ticket_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES nexus.support_tickets(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL
                CHECK (event_type IN (
                  'opened','assigned','message_sent','message_received',
                  'status_changed','first_response','resolved','closed','note'
                )),
  actor       TEXT,          -- nome/número do ator
  actor_type  TEXT DEFAULT 'system' CHECK (actor_type IN ('specialist','customer','system')),
  note        TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nexus.sla_config (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id                UUID REFERENCES nexus.domains(id),  -- NULL = padrão global
  priority                 TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  first_response_minutes   INT NOT NULL DEFAULT 60,    -- 1h
  resolution_minutes       INT NOT NULL DEFAULT 480,   -- 8h
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain_id, priority)
);

-- SLA padrão global para todas as prioridades
INSERT INTO nexus.sla_config (domain_id, priority, first_response_minutes, resolution_minutes)
VALUES
  (NULL, 'low',    240, 1440),   -- 4h / 24h
  (NULL, 'normal',  60,  480),   -- 1h /  8h
  (NULL, 'high',    30,  240),   -- 30m / 4h
  (NULL, 'urgent',  15,  120)    -- 15m / 2h
ON CONFLICT (domain_id, priority) DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_domain      ON nexus.support_tickets(domain_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status      ON nexus.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_opened_at   ON nexus.support_tickets(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_specialist  ON nexus.support_tickets(specialist_whatsapp);
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket ON nexus.ticket_events(ticket_id);
