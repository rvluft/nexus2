-- Nexus Database Schema Setup
-- Executar no PostgreSQL (local ou VPS)

-- Criar schema se não existir
CREATE SCHEMA IF NOT EXISTS nexus;

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: roles
CREATE TABLE nexus.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: permissions
CREATE TABLE nexus.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Tabela: role_permissions (muitos-para-muitos)
CREATE TABLE nexus.role_permissions (
  role_id UUID NOT NULL REFERENCES nexus.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES nexus.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Tabela: users
CREATE TABLE nexus.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES nexus.roles(id),
  team_id UUID NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para users
CREATE INDEX idx_users_email ON nexus.users(email);
CREATE INDEX idx_users_role_id ON nexus.users(role_id);
CREATE INDEX idx_users_deleted_at ON nexus.users(deleted_at) WHERE deleted_at IS NULL;

-- Tabela: files
CREATE TABLE nexus.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES nexus.users(id),
  status VARCHAR(50) DEFAULT 'uploaded',
  google_drive_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES nexus.users(id)
);

-- Índices para files
CREATE INDEX idx_files_status ON nexus.files(status);
CREATE INDEX idx_files_uploaded_by ON nexus.files(uploaded_by);
CREATE INDEX idx_files_created_at ON nexus.files(created_at DESC);
CREATE INDEX idx_files_deleted_at ON nexus.files(deleted_at) WHERE deleted_at IS NULL;

-- Tabela: ingestion_jobs
CREATE TABLE nexus.ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES nexus.files(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  n8n_execution_id VARCHAR(255),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  logs JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para ingestion_jobs
CREATE INDEX idx_ingestion_jobs_file_id ON nexus.ingestion_jobs(file_id);
CREATE INDEX idx_ingestion_jobs_status ON nexus.ingestion_jobs(status);
CREATE INDEX idx_ingestion_jobs_created_at ON nexus.ingestion_jobs(created_at DESC);

-- Tabela: knowledge_base
CREATE TABLE nexus.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES nexus.files(id) ON DELETE SET NULL,
  title VARCHAR(500),
  content TEXT NOT NULL,
  embedding_id VARCHAR(255),
  chunk_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES nexus.users(id),
  updated_by UUID NOT NULL REFERENCES nexus.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES nexus.users(id)
);

-- Índices para knowledge_base
CREATE INDEX idx_knowledge_file_id ON nexus.knowledge_base(file_id);
CREATE INDEX idx_knowledge_created_by ON nexus.knowledge_base(created_by);
CREATE INDEX idx_knowledge_deleted_at ON nexus.knowledge_base(deleted_at) WHERE deleted_at IS NULL;

-- Tabela: audit_logs
CREATE TABLE nexus.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES nexus.users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_user_id ON nexus.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON nexus.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON nexus.audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON nexus.audit_logs(resource_type, resource_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION nexus.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas que têm updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON nexus.users
  FOR EACH ROW EXECUTE FUNCTION nexus.update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON nexus.files
  FOR EACH ROW EXECUTE FUNCTION nexus.update_updated_at_column();

CREATE TRIGGER update_knowledge_updated_at BEFORE UPDATE ON nexus.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION nexus.update_updated_at_column();

COMMENT ON SCHEMA nexus IS 'Nexus - Knowledge Base Management System';
