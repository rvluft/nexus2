-- Seed inicial: roles, permissions e admin user
-- Executar DEPOIS do setup-db.sql

BEGIN;

-- Inserir roles
INSERT INTO nexus.roles (id, name, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'admin', 'Acesso total ao sistema'),
  ('550e8400-e29b-41d4-a716-446655440002', 'manager', 'Pode gerenciar arquivos, conhecimento e ingestão'),
  ('550e8400-e29b-41d4-a716-446655440003', 'viewer', 'Apenas visualização')
ON CONFLICT (name) DO NOTHING;

-- Inserir permissions
INSERT INTO nexus.permissions (id, resource, action, description) VALUES
  -- Files
  ('660e8400-e29b-41d4-a716-446655440001', 'files', 'create', 'Upload de arquivos'),
  ('660e8400-e29b-41d4-a716-446655440002', 'files', 'read', 'Listar/visualizar arquivos'),
  ('660e8400-e29b-41d4-a716-446655440003', 'files', 'delete', 'Deletar arquivos'),
  ('660e8400-e29b-41d4-a716-446655440004', 'files', 'reprocess', 'Requisitar reprocessamento'),
  -- Knowledge
  ('660e8400-e29b-41d4-a716-446655440005', 'knowledge', 'read', 'Visualizar base de conhecimento'),
  ('660e8400-e29b-41d4-a716-446655440006', 'knowledge', 'update', 'Editar/remover chunks'),
  -- Ingestion
  ('660e8400-e29b-41d4-a716-446655440007', 'ingestion', 'read', 'Ver status de ingestão'),
  -- Users
  ('660e8400-e29b-41d4-a716-446655440008', 'users', 'read', 'Listar usuários'),
  ('660e8400-e29b-41d4-a716-446655440009', 'users', 'create', 'Criar usuários'),
  ('660e8400-e29b-41d4-a716-446655440010', 'users', 'update', 'Editar usuários'),
  ('660e8400-e29b-41d4-a716-446655440011', 'users', 'delete', 'Deletar usuários'),
  -- Audit
  ('660e8400-e29b-41d4-a716-446655440012', 'audit', 'read', 'Visualizar logs de auditoria')
ON CONFLICT DO NOTHING;

-- Admin: todas permissões
INSERT INTO nexus.role_permissions (role_id, permission_id)
SELECT 
  r.id, p.id
FROM nexus.roles r, nexus.permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager: subset
INSERT INTO nexus.role_permissions (role_id, permission_id) VALUES
  ((SELECT id FROM nexus.roles WHERE name = 'manager'), '660e8400-e29b-41d4-a716-446655440001'),
  ((SELECT id FROM nexus.roles WHERE name = 'manager'), '660e8400-e29b-41d4-a716-446655440002'),
  ((SELECT id FROM nexus.roles WHERE name = 'manager'), '660e8400-e29b-41d4-a716-446655440003'),
  ((SELECT id FROM nexus.roles WHERE name = 'manager'), '660e8400-e29b-41d4-a716-446655440004'),
  ((SELECT id FROM nexus.roles WHERE name = 'manager'), '660e8400-e29b-41d4-a716-446655440005'),
  ((SELECT id FROM nexus.roles WHERE name = 'manager'), '660e8400-e29b-41d4-a716-446655440006'),
  ((SELECT id FROM nexus.roles WHERE name = 'manager'), '660e8400-e29b-41d4-a716-446655440007'),
  ((SELECT id FROM nexus.roles WHERE name = 'manager'), '660e8400-e29b-41d4-a716-446655440012')
ON CONFLICT DO NOTHING;

-- Viewer: apenas read
INSERT INTO nexus.role_permissions (role_id, permission_id) VALUES
  ((SELECT id FROM nexus.roles WHERE name = 'viewer'), '660e8400-e29b-41d4-a716-446655440002'),
  ((SELECT id FROM nexus.roles WHERE name = 'viewer'), '660e8400-e29b-41d4-a716-446655440005'),
  ((SELECT id FROM nexus.roles WHERE name = 'viewer'), '660e8400-e29b-41d4-a716-446655440007'),
  ((SELECT id FROM nexus.roles WHERE name = 'viewer'), '660e8400-e29b-41d4-a716-446655440012')
ON CONFLICT DO NOTHING;

-- Criar admin user (senha: Admin@123456 - deve ser trocada no primeiro login)
-- Hash bcrypt de "Admin@123456" (12 rounds) gerado externamente
-- Substitua este hash por um novo gerado localmente
INSERT INTO nexus.users (
  id, email, name, password_hash, role_id, is_active
) VALUES (
  'a0be15a0-f2b4-4636-ac2e-6ff9539f49d9',
  'admin@nexus.local',
  'Administrador',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewLPMPtPMPKQzH Om', -- trocar!
  (SELECT id FROM nexus.roles WHERE name = 'admin'),
  true
) ON CONFLICT (email) DO NOTHING;

COMMIT;

-- IMPORTANTE: Trocar a senha do admin após primeiro login!
-- Rodar: UPDATE nexus.users SET password_hash = '<novo_hash>' WHERE email = 'admin@nexus.local';
