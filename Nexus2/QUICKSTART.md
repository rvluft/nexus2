# Nexus — Quick Start Guide

## 🚀 Desenvolvimento Local (Docker)

### 1. Pré-requisitos

- Docker + Docker Compose
- Git

### 2. Clonar e entrar

```bash
cd /DEV/Nexus2
```

### 3. Subir ambiente

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Isso sobe:
- PostgreSQL (porta 5432)
- API NestJS (porta 4001)
- Frontend React (porta 5173)

### 4. Verificar logs

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

Espere até ver "Nexus API rodando".

### 5. Acessar

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:4001/api/docs
- **Login**:
  - Email: `admin@nexus.local`
  - Senha: `Admin@123456`

⚠️ **IMPORTANTE**: Trocar a senha do admin no primeiro login!

---

## 🐘 Sem Docker (desenvolvimento direto)

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

**Requisitos**: PostgreSQL 15+ rodando localmente com schema `nexus`.

Execute `scripts/init.sql` no banco para criar tabelas e seed.

---

## 📁 Estrutura do Projeto

```
Nexus2/
├── backend/              # NestJS API
│   ├── src/
│   │   ├── modules/      # auth, users, files, ingestion, knowledge, audit
│   │   ├── database/     # PostgresService
│   │   ├── common/       # guards, decorators, interceptor
│   │   └── main.ts
│   ├── .env
│   ├── package.json
│   └── Dockerfile
├── frontend/             # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/        # Login, Dashboard, Files, Knowledge, Admin
│   │   ├── components/   # Layout
│   │   └── lib/          # API client, Auth
│   ├── index.html
│   ├── tailwind.config.ts
│   └── Dockerfile
├── scripts/
│   └── init.sql          # Schema completo + seed
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 🔐 Segurança

- JWT com expiração 15min
- Bcrypt para senhas (12 rounds)
- Auditoria automática de todas as ações
- CORS restrito
- Rate limiting pendente (futuro)
- **NÃO subir em produção sem trocar JWT_SECRET e senha do admin!**

---

## 📦 Funcionalidades MVP

- [x] Login/JWT
- [x] CRUD Arquivos (upload via multipart)
- [x] CRUD Base de Conhecimento (manual)
- [x] Listagem de Jobs de Ingestão
- [x] Logs de Auditoria
- [x] RBAC (admin, manager, viewer)
- [ ] Integração n8n (webhook callbacks) — pendente
- [ ] Upload via Google Drive — pendente

---

## 🛠️ Troubleshooting

### API não sobe (erro de banco)

```bash
docker-compose -f docker-compose.dev.yml logs postgres
docker-compose -f docker-compose.dev.yml logs api
```

Certifique-se que o PostgreSQL está healthy antes da API.

### Frontend não conecta

Verifique se a API está rodando em `http://localhost:4001/api`.
No navegador, abra `http://localhost:4001/api/docs` para ver se o Swagger carrega.

### Erro de CORS

O frontend está configurado para `http://localhost:5173`. Se mudar a porta, ajuste `FRONTEND_URL` no `.env` do backend.

---

## 🔄 Workflow de Desenvolvimento

1. Faça alterações no código
2. Backend: hot reload automático (volumes montados)
3. Frontend: Vite hot reload no navegador
4. Commit quando estável
5. Para produção: usar `docker-compose.prod.yml`

---

## 📝 Próximos Passos

- Implementar webhook n8n para atualizar status de ingestão
- Conectar storage real (S3 ou Supabase Storage)
- Add search vetorial (pgvector)
- Testes automatizados
- Rate limiting
- Monitoramento (Prometheus/Grafana)

---

**Bom trabalho!** 🎯
