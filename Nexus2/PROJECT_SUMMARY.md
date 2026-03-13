# Nexus — Project Summary

## 📊 Visão Geral

Projeto **Nexus** refatorado para padrão Lumen (NestJS + React), com:
- Backend: NestJS 10 + TypeScript
- Frontend: React 19 + Vite + Tailwind
- Banco: PostgreSQL 15 (schema `nexus`), rodando local (Docker)
- n8n integração (workflows existentes)
- RBAC completo + auditoria automática

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────┐
│          Frontend (React + Vite)            │
│           Porta 5173 (dev)                  │
└─────────────────┬───────────────────────────┘
                  │ HTTP/REST + JWT
                  ▼
┌─────────────────────────────────────────────┐
│           Backend (NestJS API)              │
│           Porta 4001 (dev)                  │
│  • Auth (JWT, Passport)                    │
│  • Users (CRUD, roles, RBAC)               │
│  • Files (upload, list, delete, reprocess) │
│  • Ingestion (jobs status)                 │
│  • Knowledge (CRUD + busca)                │
│  • Audit (logs automáticos)                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│          PostgreSQL (schema nexus)         │
│           Porta 5432 (Docker)              │
│  • users, roles, permissions               │
│  • files, ingestion_jobs                   │
│  • knowledge_base                          │
│  • audit_logs                              │
└─────────────────────────────────────────────┘
                  │
                  │ webhook callbacks
                  ▼
            ┌─────────────┐
            │     n8n     │
            │ Workflows   │
            └─────────────┘
```

---

## 📁 Estrutura de Arquivos

```
Nexus2/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Login, JWT, strategies
│   │   │   ├── users/          # CRUD usuários + roles
│   │   │   ├── files/          # Upload, gestão arquivos
│   │   │   ├── ingestion/      # Jobs de ingestão
│   │   │   ├── knowledge/      # Base de conhecimento
│   │   │   ├── audit/          # Logs de auditoria
│   │   │   └── config/         # Health check
│   │   ├── database/           # PostgresService (pg driver)
│   │   ├── common/             # Guards, decorators, interceptor
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env                    # Variáveis dev
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/         # Layout base
│   │   ├── pages/              # Login, Dashboard, Files, Knowledge, Admin
│   │   ├── lib/                # API client, Auth context
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.ts      # Cores Lumen
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── scripts/
│   ├── init.sql                # Schema completo + seed
│   ├── setup-local.sh
│   └── generate-hash.js
├── docker-compose.dev.yml      # Ambiente desenvolvimento
├── docker-compose.prod.yml    # Ambiente produção
├── README.md                   # Documentação completa
└── QUICKSTART.md              # Guia rápido
```

---

## 🗄️ Banco de Dados (PostgreSQL)

### Schema: `nexus`

#### Tabelas principais

| Tabela | Descrição | Chaves |
|--------|-----------|--------|
| `roles` | Papéis (admin, manager, viewer) | `id` |
| `permissions` | Permissões granulares | `(resource, action)` |
| `role_permissions` | RelaçãoMany-to-many | `(role_id, permission_id)` |
| `users` | Usuários ativos/soft-delete | `email`, `role_id` |
| `files` | Metadados de uploads | `filename`, `status` |
| `ingestion_jobs` | Processamento n8n | `file_id`, `status` |
| `knowledge_base` | Chunks de conhecimento | `file_id`, `chunk_order` |
| `audit_logs` | Todas as ações | `user_id`, `action`, `created_at` |

#### Índices

- Performance em queries de listagem
- Filtros por status, data, usuário
- Soft delete (`deleted_at IS NULL`)

#### Triggers

- `update_updated_at_column()` — atualiza `updated_at` automaticamente

---

## 🔐 Autenticação e Autorização

### JWT

- **Issuer**: Nexus API
- **Expiry**: 15 minutos (access token)
- **Payload**: `{ sub, email, name, role, team }`
- **Algoritmo**: HS256 (configurável via `JWT_SECRET`)

### RBAC (Roles & Permissions)

| Role | Permissões |
|------|------------|
| `admin` | Todas as permissões |
| `manager` | files (CRUD + reprocess), knowledge (CRUD), ingestion (read), audit (read) |
| `viewer` | files (read), knowledge (read), ingestion (read), audit (read) |

Implementação:
- `@Roles()` decorator
- `RolesGuard` (verifica roles do usuário na requisição)
- Guards aplicados por rota/controller

---

## 📝 API Endpoints

### Públicas
- `POST /api/auth/login` — login (JWT)
- `POST /api/auth/register` — registro (apenas admin)

### Protegidas (JWT required)

#### Files
- `GET /api/files` — listagem com filtros
- `POST /api/files` — upload multipart
- `GET /api/files/:id` — detalhe
- `POST /api/files/:id/reprocess` — re-enviar para n8n
- `DELETE /api/files/:id` — soft delete

#### Knowledge
- `GET /api/knowledge` — listagem + busca full-text
- `POST /api/knowledge` — criar item manual
- `PATCH /api/knowledge/:id` — atualizar
- `DELETE /api/knowledge/:id` — remover

#### Ingestion
- `GET /api/ingestion` — lista jobs
- `GET /api/ingestion/:id` — detalhe job

#### Users (Admin/Manager)
- `GET /api/users` — listar
- `POST /api/users` — criar
- `PATCH /api/users/:id` — atualizar
- `DELETE /api/users/:id` — soft delete

#### Audit (Admin/Manager)
- `GET /api/audit` — logs com filtros
- `GET /api/audit/:id` — detalhe

#### Health
- `GET /health` — status da API

**Swagger Docs**: `GET /api/docs`

---

## 🎨 Design System (Padrão Lumen)

### Cores

```css
--color-primary: #00d4d4;    /* Turquesa Vibrante */
--color-secondary: #0a2f5f;  /* Azul Profundo */
--color-accent: #c8ff00;     /* Verde Limão */
--color-white: #ffffff;
```

### Gradientes

- `gradient-lumen`: `linear-gradient(135deg, #00d4d4 0%, #0a2f5f 100%)`
- `gradient-energetic`: `linear-gradient(135deg, #c8ff00 0%, #00d4d4 100%)`

### Fontes

- **Display/Body**: `Outfit` (Google Fonts)

---

## 🔌 Integração n8n

### Workflow 1: WhatsApp (`c7d9zdonIxWPpZSf`)

- **Trigger**: Webhook (POST)
- **Payload**: Evolution API (messages.upsert)
- **Output**: Consulta RAG + resposta

### Workflow 2: Ingestão (`LhxtBhFyg76BIala`)

- **Trigger**: Google Drive (poll a cada 1min)
- **Pasta**: `Nao_Processados`
- **Processamento**: Extrai texto de PDF, DOCX, XLSX, TXT
- **Output**: Popula Supabase pgvector
- **Pós-processamento**: Move arquivo para `Processados`

**Nexus gerencia apenas metadados** (tabela `files`). O workflow n8n lê do Drive diretamente.

---

## 🚀 Deploy (Produção)

> **Status**: pendente aprovação de segurança

### Requisitos VPS

- Docker + Docker Compose
- PostgreSQL 15+ (com pgvector se for usar busca vetorial)
- nginx (proxy reverso)
- Certificado SSL (Let's Encrypt)

### Passos

1. **Copiar código** para `/opt/nexus` no servidor
2. **Criar `.env`** no backend com variáveis de produção
3. **Executar script SQL** no banco de produção:
   ```bash
   psql -U postgres -d nexus_prod -f scripts/init.sql
   ```
4. **Gerar hash bcrypt** para nova senha do admin:
   ```bash
   node scripts/generate-hash.js 'NovaSenhaForte'
   ```
   Atualizar no banco.
5. **Subir containers**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```
6. **Configurar nginx**:
   - Proxy `/` → frontend (porta 80/443)
   - Proxy `/api` → backend (porta 4001)
7. **HTTPS**: Certbot (Let's Encrypt)
8. **Testar**: Acessar domínio e fazer login

---

## ✅ Checklist de Segurança (antes de deploy)

- [ ] Alterar `JWT_SECRET` (64 chars aleatórios)
- [ ] Alterar senha do admin (`admin@nexus.local`)
- [ ] Configurar firewall (apenas 80/443 abertos)
- [ ] Habilitar HTTPS (certificado válido)
- [ ] backups automáticos do PostgreSQL
- [ ] Monitorar logs (Winston + arquivo)
- [ ] Rate limiting (pendente implementação)
- [ ] Scan de vulnerabilidades (dependências)

---

## 📊 Status do Desenvolvimento

### ✅ Concluído

- [x] Estrutura NestJS completa
- [x] Autenticação JWT
- [x] RBAC (roles + permissions)
- [x] CRUD Files (upload local)
- [x] CRUD Knowledge
- [x] CRUD Users (admin/manager)
- [x] Listagem Ingestion Jobs
- [x] Audit Logs automáticos (interceptor global)
- [x] Frontend React (login, dashboard, files, knowledge, admin)
- [x] Padrão visual Lumen (Tailwind)
- [x] Docker dev + prod
- [x] Scripts SQL (schema + seed)
- [x] Documentação (README + QUICKSTART)

### ⏳ Pendente

- [ ] Integração n8n callbacks (atualizar status de jobs)
- [ ] Upload via Google Drive API (opcional)
- [ ] Search vetorial (pgvector integration)
- [ ] Rate limiting
- [ ] Testes automatizados (Jest)
- [ ] CI/CD pipeline
- [ ] Monitoramento (health checks, metrics)

---

## 📝 Workflow de Commits

```bash
git add .
git commit -m "Descrição clara da mudança"
git push origin main
```

Seguir convenções:
- feat: nova funcionalidade
- fix: correção de bug
- chore: tarefas de manutenção
- docs: documentação
- refactor: refatoração sem mudança de comportamento

---

## 🐛 Troubleshooting

### API não conecta ao banco

Verificar:
```bash
docker-compose -f docker-compose.dev.yml logs postgres
docker-compose -f docker-compose.dev.yml logs api
```

Certificar que o contêiner `postgres` está healthy.

### Upload falha (413 Request Entity Too Large)

Ajustar `limits.fileSize` no `MulterModule` (backend) e Nginx (se houver proxy).

### Frontend mostra erro de CORS

Verificar `FRONTEND_URL` no `.env` do backend.

---

## 📞 Contato

Desenvolvido para **Lumen** — Knowledge Base Management com n8n.

Versão: 1.0.0 | Data: 2026-03-12
