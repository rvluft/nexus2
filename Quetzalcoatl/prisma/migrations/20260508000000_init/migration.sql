CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  ai_summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'vigente',
  priority TEXT NOT NULL DEFAULT 'media',
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT,
  confidence TEXT NOT NULL DEFAULT 'alta',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_content TEXT NOT NULL,
  suggested_project_id UUID REFERENCES projects(id),
  suggested_type TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  source TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_memories_project_id ON memories(project_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_status ON memories(status);
CREATE INDEX idx_memories_priority ON memories(priority);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_content_search ON memories USING GIN(to_tsvector('portuguese', title || ' ' || content));
