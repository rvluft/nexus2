# Nexus — Knowledge Base Management System

Interface administrativa para gestão de base de conhecimento com integração n8n e Google Drive.

> **Status**: Desenvolvimento local — **NÃO SUBIR EM PRODUÇÃO SEM APROVAÇÃO DE SEGURANÇA**

---

## 🚀 Quick Start (Desenvolvimento Local)

### Opção A: Docker Compose (recomendado)

```bash
cd /DEV/Nexus2
docker-compose -f docker-compose.dev.yml up -d
```

Acesso:
- Frontend: http://localhost:5173
- API Docs: http://localhost:4001/api/docs
- Login: `admin@nexus.local` / `Admin@123456`

### Opção B: Sem Docker

Ver `QUICKSTART.md` para instalação manual (PostgreSQL local necessário).

---

## 🏗️ Arquitetura

```
Frontend (React 19 + Vite + Tailwind)
         │
         ▼
Backend API (NestJS 10 + TypeScript)
         │
         ▼
PostgreSQL (schema nexus) — local Docker
         │
         └─> n8n (workflows existentes)
```

### Stack Técnica

- **Backend**: NestJS, TypeScript, JWT, bcrypt, pg, winston
- **Frontend**: React 19, Vite, Tailwind CSS, Axios, React Router
- **Banco**: PostgreSQL 15 (Supabase image) com schema `nexus`
- **Design**: Padrão Lumen (cores: turquesa #00d4d4, azul #0a2f5f, limão #c8ff00)
- **Deploy**: Docker + Docker Compose (dev e prod)

---

## 📋 Funcionalidades MVP

### ✅ Implementado

- [x] Autenticação JWT (Lumen pattern)
- [x] RBAC completo (admin, manager, viewer)
- [x] CRUD de Arquivos (upload, list, delete, reprocess)
- [x] CRUD de Base de Conhecimento (manual)
- [x] Visualização de Jobs de Ingestão
- [x] Logs de Auditoria automáticos (interceptor global)
- [x] Frontend completo (Login, Dashboard, Files, Knowledge, Admin)
- [x] Docker local + produção
- [x] Schema SQL completo + seed
- [x] Health check endpoint

### ⏳ Pendente (futuro)

- [ ] Integração n8n callbacks (status updates)
- [ ] Upload via Google Drive API
- [ ] Search vetorial (pgvector)
- [ ] Rate limiting
- [ ] Testes automatizados
- [ ] CI/CD
- [ ] Monitoring (Prometheus/Grafana)

---

## 🗄️ Banco de Dados

Schema: `nexus` no PostgreSQL.

### Tabelas

- `roles` — admin, manager, viewer
- `permissions` — granular: files.create, files.read, etc.
- `role_permissions` — associação many-to-many
- `users` — usuários ativos (soft delete)
- `files` — metadados de uploads
- `ingestion_jobs` — status de processamento n8n
- `knowledge_base` — chunks de conhecimento
- `audit_logs` — logs de todas as ações

### Migração

Script: `scripts/init.sql` (cria schema + seed).

Executar (ambiente local Docker):
```bash
docker-compose exec postgres psql -U nexus -d nexus -f /docker-entrypoint-initdb.d/init.sql
```

Produção:
```bash
psql -U postgres -d sua_base -f scripts/init.sql
```

---

## 🔐 Segurança

- **JWT**: 15min expiração, segredo forte (trocável via env)
- **Senhas**: bcrypt (12 rounds)
- **Auditoria**: toda requisição autenticada é logada (usuário, ação, IP, timestamp)
- **CORS**: restrito ao frontend origin
- **Rate limiting**: pendente (futuro)
- **Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

⚠️ **ANTES DE PRODUÇÃO**:
- Trocar `JWT_SECRET` (use `openssl rand -hex 64`)
- Trocar senha do admin (`admin@nexus.local`)
- Habilitar HTTPS (nginx + Let's Encrypt)
- Configurar firewall (apenas 80/443)
- Backups automáticos do PostgreSQL
- Monitoramento de logs

---

## 🎨 Design System (Padrão Lumen)

### Cores

```css
primary: #00d4d4   /* Turquesa */
secondary: #0a2f5f /* Azul Profundo */
accent: #c8ff00    /* Verde Limão */
```

### Gradientes

- `gradient-lumen`: turquesa → azul
- `gradient-energetic`: limão → turquesa

### Fonte

- **Outfit** (Google Fonts) — display e body

---

## 📁 Estrutura do Projeto

```
Nexus2/
├── backend/          # NestJS API
├── frontend/         # React + Vite
├── scripts/          # SQL e utils
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── README.md
├── QUICKSTART.md    # Guia rápido
├── PROJECT_SUMMARY.md # Sumário técnico
└── MIGRATION_GUIDE.md # Migração do sistema antigo
```

---

## 🚀 Comandos Úteis

### Docker (desenvolvimento)

```bash
# Subir tudo
docker-compose -f docker-compose.dev.yml up -d

# Logs
docker-compose -f docker-compose.dev.yml logs -f

# Parar
docker-compose -f docker-compose.dev.yml down

# Rebuild (após mudanças no Dockerfile)
docker-compose -f docker-compose.dev.yml build --no-cache
```

### Backend (fora do Docker)

```bash
cd backend
npm install
npm run start:dev     # hot reload
npm run build         # build para produção
npm run start:prod    # Executar dist/
```

### Frontend (fora do Docker)

```bash
cd frontend
npm install
npm run dev           # Vite dev server (porta 5173)
npm run build         # Build para produção (dist/)
npm run preview       # Preview do build
```

### Banco de dados

```bash
# Acessar PostgreSQL (Docker)
docker-compose exec postgres psql -U nexus -d nexus

# Listar tabelas
\dt nexus.*

# Executar script SQL
\i scripts/init.sql
```

---

## 📝 Workflows n8n (já existentes)

1. **WhatsApp** (`c7d9zdonIxWPpZSf`): recebe mensagens Evolution API → consulta RAG → responde
2. **Ingestão** (`LhxtBhFyg76BIala`): monitora Google Drive "Nao_Processados" → extrai texto → pgvector

Nexus gerencia metadados; n8n faz o processamento pesado.

---

## 🧪 Testes

```bash
# Backend
cd backend
npm test              # unit tests
npm run test:e2e      # e2e tests
npm run test:cov      # coverage

# Frontend
cd frontend
npm run lint
```

---

## 📦 Deploy em Produção

> **Aguardando aprovação de segurança**

Ver `MIGRATION_GUIDE.md` para instruções completas de migração e deploy.

Passos resumidos:
1. Copiar código para VPS
2. Configurar `.env` (JWT_SECRET, DB_PASSWORD, etc)
3. Criar banco PostgreSQL + executar `scripts/init.sql`
4. Gerar nova senha do admin
5. Rodar `docker-compose -f docker-compose.prod.yml up -d`
6. Configurar nginx proxy (80/443)
7. Habilitar HTTPS (Let's Encrypt)
8. Testar

---

## 📚 Documentação

- `QUICKSTART.md` — Guia rápido de instalação
- `PROJECT_SUMMARY.md` — Sumário técnico completo
- `MIGRATION_GUIDE.md` — Migração do sistema antigo (PHP/MySQL)
- `docs/` (futuro) — Documentação detalhada da API

---

## 🤝 Contribuição

1. Fork
2. Create branch (`feat/`, `fix/`, `chore/`)
3. Commit com mensagem clara
4. Push
5. Pull request

---

## 📄 Licença

Proprietário — Lumen

---

**Desenvolvido com ❤️ para Lumen — Knowledge Base Management**

Versão: 1.0.0 | Data: 2026-03-12
