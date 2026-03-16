-- ============================================================
-- Fase 3 — Domínios de Conhecimento
-- ============================================================

CREATE TABLE IF NOT EXISTS nexus.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#00d4d4',
  icon VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES nexus.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (name)
);

-- Um arquivo pode pertencer a múltiplos domínios
CREATE TABLE IF NOT EXISTS nexus.file_domains (
  file_id UUID REFERENCES nexus.files(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES nexus.domains(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES nexus.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (file_id, domain_id)
);

CREATE INDEX IF NOT EXISTS idx_file_domains_file ON nexus.file_domains(file_id);
CREATE INDEX IF NOT EXISTS idx_file_domains_domain ON nexus.file_domains(domain_id);
