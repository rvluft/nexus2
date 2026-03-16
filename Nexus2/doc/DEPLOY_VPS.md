# Deploy Nexus2 — VPS

> Guia completo de implantação em servidor Linux (Ubuntu 22.04 / Debian 12 recomendado).

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Preparar o servidor](#2-preparar-o-servidor)
3. [Clonar o repositório](#3-clonar-o-repositório)
4. [Variáveis de ambiente](#4-variáveis-de-ambiente)
5. [Banco de dados — setup inicial](#5-banco-de-dados--setup-inicial)
6. [Build e subida dos containers](#6-build-e-subida-dos-containers)
7. [Nginx reverso + SSL (Certbot)](#7-nginx-reverso--ssl-certbot)
8. [Configuração n8n](#8-configuração-n8n)
9. [Manutenção](#9-manutenção)
10. [Referência de portas e tokens](#10-referência-de-portas-e-tokens)

---

## 1. Pré-requisitos

| Recurso | Mínimo | Recomendado |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Disco | 20 GB | 50 GB SSD |
| SO | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

**Software necessário na VPS:**

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Nginx (para reverse proxy)
sudo apt install -y nginx certbot python3-certbot-nginx

# Git e utilitários
sudo apt install -y git curl openssl
```

---

## 2. Preparar o servidor

### 2.1 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

> As portas 4100 (API) e 5100 (frontend) **não** precisam ser abertas publicamente — o Nginx fará o proxy. Abra-as somente se precisar de acesso direto temporário.

### 2.2 Criar usuário de deploy (opcional, recomendado)

```bash
sudo adduser nexus
sudo usermod -aG docker nexus
sudo su - nexus
```

---

## 3. Clonar o repositório

```bash
cd /opt
git clone <URL_DO_REPOSITORIO> nexus2
cd nexus2
```

---

## 4. Variáveis de ambiente

### 4.1 Backend — `/opt/nexus2/backend/.env`

Copie o template e preencha todos os valores:

```bash
cp backend/.env backend/.env.bak   # backup do arquivo de dev
nano backend/.env
```

**Conteúdo completo de produção:**

```dotenv
# ── Aplicação ──────────────────────────────────────────────
NODE_ENV=production
LOG_LEVEL=warn
API_PORT=4001

# URL pública da API (sem barra final)
# Se estiver com Nginx na porta 443: https://seu-dominio.com
API_PUBLIC_URL=https://seu-dominio.com

# URL pública do frontend (sem barra final)
FRONTEND_URL=https://seu-dominio.com

# ── Banco de dados ─────────────────────────────────────────
# Usuário/senha definidos no docker-compose — altere para produção
DB_USERNAME=nexus
DB_PASSWORD=SENHA_FORTE_AQUI          # ← alterar
DB_DATABASE=nexus

# ── Autenticação JWT ───────────────────────────────────────
JWT_SECRET=SEGREDO_ALEATORIO_LONGO_64_CHARS   # ← alterar (use: openssl rand -hex 32)
JWT_EXPIRES_IN=15m

# ── Integração n8n ─────────────────────────────────────────
# URL base do n8n na VPS (sem barra final)
N8N_BASE_URL=https://n8n.seu-dominio.com

# URLs dos webhooks n8n (preenchidas após criar os workflows)
N8N_FILES_WORKFLOW_UPLOAD_URL=${N8N_BASE_URL}/webhook/nexus-file-upload
N8N_WEBHOOK_STATUS_URL=${N8N_BASE_URL}/webhook/nexus-status-callback
N8N_INGESTION_WEBHOOK_URL=${N8N_BASE_URL}/webhook/nexus-ingestion-trigger

# IDs de workflow (preencher após importar os workflows no n8n)
N8N_WORKFLOW_INGESTION_ID=

# ── Tokens estáticos de webhook (gere com: openssl rand -hex 24) ──
METRICS_WEBHOOK_TOKEN=TOKEN_METRICAS_AQUI
BLOCKLIST_WEBHOOK_TOKEN=TOKEN_BLOCKLIST_AQUI
N8N_INGESTION_CALLBACK_TOKEN=TOKEN_INGESTION_AQUI
TICKETS_WEBHOOK_TOKEN=TOKEN_TICKETS_AQUI
```

**Gerar tokens aleatórios:**

```bash
# Gerar um token seguro
openssl rand -hex 24

# Gerar JWT_SECRET
openssl rand -hex 32
```

### 4.2 Docker Compose — `/opt/nexus2/.env` (raiz do projeto)

```bash
nano /opt/nexus2/.env
```

```dotenv
DB_PASSWORD=MESMA_SENHA_DO_BACKEND
DB_USERNAME=nexus
DB_DATABASE=nexus
JWT_SECRET=MESMO_SEGREDO_DO_BACKEND
FRONTEND_URL=https://seu-dominio.com
N8N_BASE_URL=https://n8n.seu-dominio.com
N8N_WORKFLOW_INGESTION_ID=
```

---

## 5. Banco de dados — setup inicial

O `init.sql` é executado automaticamente na primeira vez que o container Postgres sobe (via `docker-entrypoint-initdb.d`). Ele cria schema, tabelas base e roles.

Após a primeira subida, execute as **migrations de features** na ordem:

```bash
# 1. Subir apenas o Postgres primeiro
docker compose -f docker-compose.prod.yml up -d postgres

# Aguardar ficar healthy (~15s)
docker compose -f docker-compose.prod.yml ps

# 2. Executar migrations em ordem
docker exec nexus-postgres-prod psql -U nexus -d nexus \
  -f /docker-entrypoint-initdb.d/init.sql 2>/dev/null || true

for script in \
  scripts/migration_fase1_2_metrics.sql \
  scripts/migration_fase3_domains.sql \
  scripts/migration_fase5_1_expert.sql \
  scripts/migration_fase6_blocklist.sql \
  scripts/migration_fase8_sla.sql \
  scripts/seed-roles.sql
do
  echo "Executando $script..."
  docker exec -i nexus-postgres-prod psql -U nexus -d nexus < $script
done
```

### 5.1 Criar usuário admin inicial

```bash
# Gerar hash bcrypt da senha (instale bcrypt: npm install bcrypt)
cd scripts && node generate-hash.js 'SuaSenhaAdmin@123'
# Copie o hash gerado

# Inserir admin no banco
docker exec -i nexus-postgres-prod psql -U nexus -d nexus << 'SQL'
INSERT INTO nexus.users (name, email, password_hash, role_id, is_active, created_at, updated_at)
VALUES (
  'Administrador',
  'admin@empresa.com',
  '$2b$12$HASH_GERADO_ACIMA',    -- ← substitua pelo hash gerado
  '550e8400-e29b-41d4-a716-446655440001',  -- role admin
  true, NOW(), NOW()
)
ON CONFLICT (email) DO NOTHING;
SQL
```

---

## 6. Build e subida dos containers

### 6.1 Ajustar o `docker-compose.prod.yml`

O arquivo já existente na raiz precisa de dois ajustes para compatibilidade com o nginx:

- O serviço `api` deve chamar-se `nexus-api` (o nginx faz proxy para `http://nexus-api:4001`)
- Expor o frontend na porta 5100 (ou apenas deixar o Nginx externo acessar pela rede)

**Edite `docker-compose.prod.yml`** e confirme que os `container_name` estão assim:

```yaml
services:
  postgres:
    container_name: nexus-postgres-prod
    # ...

  api:
    container_name: nexus-api          # ← importante: exatamente "nexus-api"
    # ...

  frontend:
    container_name: nexus-frontend
    ports:
      - "5100:80"
    # ...
```

### 6.2 Build e start completo

```bash
cd /opt/nexus2

# Build de todas as imagens (primeira vez ~5-10 min)
docker compose -f docker-compose.prod.yml build \
  --build-arg VITE_API_URL=https://seu-dominio.com/api

# Subir tudo
docker compose -f docker-compose.prod.yml up -d

# Verificar status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

### 6.3 Verificar saúde

```bash
# API respondendo
curl http://localhost:4100/api/health   # ou /api/docs

# Frontend servindo
curl -I http://localhost:5100
```

---

## 7. Nginx reverso + SSL (Certbot)

O Nginx da VPS age como reverse proxy público, terminando TLS e roteando para os containers.

### 7.1 Configuração Nginx

```bash
sudo nano /etc/nginx/sites-available/nexus
```

```nginx
# ── HTTP → HTTPS redirect ─────────────────────────────────────
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    return 301 https://$host$request_uri;
}

# ── HTTPS principal ───────────────────────────────────────────
server {
    listen 443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    # Certificados (gerados pelo Certbot na seção 7.2)
    ssl_certificate     /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Upload de arquivos grandes
    client_max_body_size 100M;

    # ── Frontend (SPA) ────────────────────────────────────────
    location / {
        proxy_pass http://localhost:5100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── API ───────────────────────────────────────────────────
    location /api/ {
        proxy_pass http://localhost:4100/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # ── Storage (arquivos enviados) ───────────────────────────
    location /storage/ {
        proxy_pass http://localhost:4100/storage/;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 7.2 Certificado SSL gratuito (Let's Encrypt)

```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

Renovação automática já é configurada pelo Certbot. Para testar:

```bash
sudo certbot renew --dry-run
```

---

## 8. Configuração n8n

O n8n já está rodando na VPS. Configure as variáveis de ambiente do Nexus backend com as URLs corretas dos webhooks após criar os workflows.

### 8.1 Tokens — configure como variáveis de ambiente no n8n

| Variável n8n | Valor |
|---|---|
| `API_URL` | `https://seu-dominio.com/api` |
| `METRICS_WEBHOOK_TOKEN` | Valor definido no `.env` backend |
| `BLOCKLIST_WEBHOOK_TOKEN` | Valor definido no `.env` backend |
| `N8N_INGESTION_CALLBACK_TOKEN` | Valor definido no `.env` backend |
| `TICKETS_WEBHOOK_TOKEN` | Valor definido no `.env` backend |

### 8.2 Endpoints que o n8n consome

| Finalidade | Método | Endpoint | Token header |
|---|---|---|---|
| Callback status de arquivo | `PATCH` | `/api/files/:id/status` | JWT |
| Ingestão concluída | `POST` | `/api/n8n/ingestion-callback` | `N8N_INGESTION_CALLBACK_TOKEN` |
| Métricas RAG | `POST` | `/api/metrics/webhook` | `METRICS_WEBHOOK_TOKEN` |
| Verificar blocklist | `GET` | `/api/blocklist/check/:number` | `BLOCKLIST_WEBHOOK_TOKEN` |
| Criar/atualizar ticket | `POST` | `/api/tickets/webhook` | `TICKETS_WEBHOOK_TOKEN` |
| Evento em ticket | `POST` | `/api/tickets/:id/events` | `TICKETS_WEBHOOK_TOKEN` |

### 8.3 Endpoints que o Nexus chama no n8n

| Finalidade | Variável de configuração |
|---|---|
| Notificar upload de arquivo | `N8N_FILES_WORKFLOW_UPLOAD_URL` |
| Callback de status | `N8N_WEBHOOK_STATUS_URL` |
| Trigger de ingestão RAG | `N8N_INGESTION_WEBHOOK_URL` |

**Payload esperado pelo Nexus ao chamar o n8n para ingestão:**

```json
{
  "file": {
    "id": "uuid",
    "original_name": "documento.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 102400,
    "download_url": "https://seu-dominio.com/storage/arquivo.pdf"
  },
  "jobId": "uuid-do-job",
  "callbackUrl": "https://seu-dominio.com/api/n8n/ingestion-callback"
}
```

**Payload que o n8n deve enviar ao callback:**

```json
{
  "jobId": "uuid-do-job",
  "fileId": "uuid-do-arquivo",
  "status": "completed",   // ou "failed"
  "error": "mensagem de erro (opcional)"
}
```
Header: `Authorization: Bearer <N8N_INGESTION_CALLBACK_TOKEN>`

---

## 9. Manutenção

### Comandos do dia a dia

```bash
# Status de todos os containers
docker compose -f docker-compose.prod.yml ps

# Logs em tempo real
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f frontend

# Reiniciar um serviço
docker compose -f docker-compose.prod.yml restart api

# Parar tudo
docker compose -f docker-compose.prod.yml down

# Subir tudo
docker compose -f docker-compose.prod.yml up -d
```

### Deploy de nova versão

```bash
cd /opt/nexus2

# 1. Puxar código novo
git pull origin main

# 2. Rebuild (somente serviços alterados)
docker compose -f docker-compose.prod.yml build api
# ou
docker compose -f docker-compose.prod.yml build \
  --build-arg VITE_API_URL=https://seu-dominio.com/api frontend

# 3. Reiniciar com nova imagem (zero-downtime: api primeiro, depois frontend)
docker compose -f docker-compose.prod.yml up -d --no-deps api
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
```

### Executar migrations após atualização

```bash
# Se houver novos arquivos em scripts/migration_*.sql
docker exec -i nexus-postgres-prod psql -U nexus -d nexus \
  < scripts/migration_nova.sql
```

### Backup do banco

```bash
# Dump completo
docker exec nexus-postgres-prod pg_dump -U nexus nexus \
  > /opt/backups/nexus_$(date +%Y%m%d_%H%M%S).sql

# Restore
cat backup.sql | docker exec -i nexus-postgres-prod psql -U nexus -d nexus
```

**Cron de backup diário** (`crontab -e`):

```cron
0 3 * * * docker exec nexus-postgres-prod pg_dump -U nexus nexus > /opt/backups/nexus_$(date +\%Y\%m\%d).sql && find /opt/backups -name "*.sql" -mtime +30 -delete
```

### Limpeza de imagens antigas

```bash
docker image prune -f
docker volume prune -f   # CUIDADO: não remove volumes em uso
```

---

## 10. Referência de portas e tokens

### Portas internas (dentro da rede Docker)

| Container | Porta interna | Exposição externa |
|---|---|---|
| `nexus-postgres-prod` | 5432 | Nenhuma (somente rede interna) |
| `nexus-api` | 4001 | 4100 → host |
| `nexus-frontend` | 80 | 5100 → host |

### Portas públicas (via Nginx)

| Porta | Protocolo | Descrição |
|---|---|---|
| 80 | HTTP | Redireciona para 443 |
| 443 | HTTPS | Frontend + API + Storage |

### Variáveis sensíveis — checklist antes de ir ao ar

- [ ] `DB_PASSWORD` — senha forte (mínimo 20 chars, letras+números+símbolos)
- [ ] `JWT_SECRET` — 64 caracteres aleatórios (`openssl rand -hex 32`)
- [ ] `METRICS_WEBHOOK_TOKEN` — gerado com `openssl rand -hex 24`
- [ ] `BLOCKLIST_WEBHOOK_TOKEN` — gerado com `openssl rand -hex 24`
- [ ] `N8N_INGESTION_CALLBACK_TOKEN` — gerado com `openssl rand -hex 24`
- [ ] `TICKETS_WEBHOOK_TOKEN` — gerado com `openssl rand -hex 24`
- [ ] Senha do usuário admin alterada após primeiro login
- [ ] Firewall bloqueando portas 4100 e 5100 externamente
- [ ] SSL/TLS ativo com certificado válido

### Migrations — ordem obrigatória

```
scripts/init.sql                      ← executado automaticamente pelo Postgres
scripts/seed-roles.sql                ← roles + admin user
scripts/migration_fase1_2_metrics.sql ← métricas RAG + alertas
scripts/migration_fase3_domains.sql   ← domínios + file_domains
scripts/migration_fase5_1_expert.sql  ← especialista WhatsApp por domínio
scripts/migration_fase6_blocklist.sql ← blocklist WhatsApp
scripts/migration_fase8_sla.sql       ← tickets + SLA + ticket_events
```

---

*Gerado em: 2026-03-16 — Nexus2 vFinal*
