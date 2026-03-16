# Refatoração para Caddy — Nexus2

> Substituição do stack **Nginx host + Certbot** pelo **Caddy** como único ponto de entrada,
> com SSL automático, HTTP/2, HTTP/3 e sem configuração manual de certificados.

---

## O que muda

| Componente | Antes (nginx) | Depois (caddy) |
|---|---|---|
| Reverse proxy host | Nginx instalado na VPS | Caddy rodando em container |
| SSL/TLS | Certbot manual + cron renovação | Let's Encrypt automático nativo |
| Frontend container | `nginx:alpine` + `nginx.conf` | `caddy:2-alpine` com dist baked |
| HTTP/3 | Não | Sim (QUIC/UDP 443) |
| Porta 4100 exposta | Sim (API) | Não (Caddy acessa via rede Docker) |
| Porta 5100 exposta | Sim (frontend) | Não (somente 80/443 públicas) |
| Arquivo de config | `/etc/nginx/sites-available/nexus` | `Caddyfile` na raiz do projeto |
| Certificados | `/etc/letsencrypt/` no host | Volume Docker `caddy_data` |

### Arquivos criados

```
Nexus2/
├── Caddyfile                      ← configuração do Caddy (substitui nginx host)
├── docker-compose.caddy.yml       ← compose de produção com Caddy
└── frontend/
    └── Dockerfile.caddy           ← build React + Caddy (substitui Dockerfile.prod)
```

### Arquivos que deixam de ser usados em produção

```
frontend/nginx.conf                ← usado só no setup de dev local
frontend/Dockerfile.prod           ← substituído por Dockerfile.caddy
docker-compose.prod.yml            ← substituído por docker-compose.caddy.yml
```

> `nginx.conf` e `Dockerfile.prod` podem ser mantidos no repositório para o
> ambiente de dev local — não afetam o deploy com Caddy.

---

## Pré-requisitos no servidor

```bash
# Apenas Docker — Nginx e Certbot NÃO precisam ser instalados
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp    # HTTP/3
sudo ufw enable
```

**Importante:** se o Nginx do Ubuntu estiver instalado e rodando na porta 80, pare-o:

```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
```

---

## Variáveis de ambiente

### `/opt/nexus2/.env` (raiz do projeto — lido pelo docker-compose)

```dotenv
# Domínio público (sem https://, sem barra final)
DOMAIN=nexus.empresa.com

# Banco
DB_USERNAME=nexus
DB_PASSWORD=SENHA_FORTE_AQUI
DB_DATABASE=nexus

# JWT
JWT_SECRET=SEU_SEGREDO_64_CHARS_AQUI

# n8n
N8N_BASE_URL=https://n8n.empresa.com
N8N_WORKFLOW_INGESTION_ID=
```

### `/opt/nexus2/backend/.env` (lido pelo container api)

Igual ao documentado em `DEPLOY_VPS.md`, com um ajuste:

```dotenv
# URL pública da API — agora é o próprio domínio (Caddy faz o roteamento)
API_PUBLIC_URL=https://nexus.empresa.com
FRONTEND_URL=https://nexus.empresa.com
```

---

## Estrutura do Caddyfile

O arquivo `Caddyfile` na raiz do projeto é montado como volume somente-leitura no
container Caddy. O domínio é injetado pela variável de ambiente `DOMAIN`:

```caddyfile
{$DOMAIN} {

    encode zstd gzip

    # Proxy para a API NestJS
    handle /api/* {
        reverse_proxy nexus-api:4001
    }

    # Proxy para storage de arquivos enviados
    handle /storage/* {
        reverse_proxy nexus-api:4001
    }

    # Frontend SPA — Caddy serve os arquivos estáticos diretamente
    handle {
        root * /srv/frontend
        try_files {path} /index.html
        file_server
    }

    # Headers de segurança
    header {
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        -Server
    }
}
```

**Como o Caddy resolve `nexus-api`:** o `container_name: nexus-api` no
docker-compose faz o DNS interno Docker funcionar. O Caddyfile usa esse nome
diretamente — nenhuma configuração extra.

---

## Dockerfile.caddy (frontend)

O `frontend/Dockerfile.caddy` tem dois estágios:

1. **Builder** — instala dependências Node, roda `npm run build`, gera `dist/`
2. **Production** — imagem `caddy:2-alpine`, copia o `dist/` para `/srv/frontend`

```dockerfile
FROM node:22-alpine AS builder
ARG VITE_API_URL=/api          # relativo — Caddy resolve internamente
ENV VITE_API_URL=${VITE_API_URL}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine AS production
COPY --from=builder /app/dist /srv/frontend
EXPOSE 80 443 443/udp
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
```

> `VITE_API_URL=/api` (relativo): como o Caddy já serve o frontend no mesmo
> domínio e roteia `/api/*` para a API, não é necessário URL absoluta — o browser
> resolve automaticamente.

---

## Deploy inicial

### 1. Clonar o repositório

```bash
cd /opt
git clone git@github.com:rvluft/nexus2.git nexus2
cd nexus2
```

### 2. Criar os arquivos de ambiente

```bash
# .env raiz
cat > .env << EOF
DOMAIN=nexus.empresa.com
DB_USERNAME=nexus
DB_PASSWORD=$(openssl rand -hex 20)
DB_DATABASE=nexus
JWT_SECRET=$(openssl rand -hex 32)
N8N_BASE_URL=https://n8n.empresa.com
N8N_WORKFLOW_INGESTION_ID=
EOF

# backend/.env — copiar e ajustar
cp backend/.env.example backend/.env
nano backend/.env
# Ajustar: API_PUBLIC_URL, FRONTEND_URL, DB_*, JWT_SECRET, tokens de webhook
```

### 3. Subir o banco e executar migrations

```bash
# Subir apenas o Postgres
docker compose -f docker-compose.caddy.yml up -d postgres

# Aguardar healthcheck
docker compose -f docker-compose.caddy.yml ps

# Migrations em ordem
for sql in \
  scripts/migration_fase1_2_metrics.sql \
  scripts/migration_fase3_domains.sql \
  scripts/migration_fase5_1_expert.sql \
  scripts/migration_fase6_blocklist.sql \
  scripts/migration_fase8_sla.sql \
  scripts/seed-roles.sql
do
  echo "→ $sql"
  docker exec -i nexus-postgres psql -U nexus -d nexus < $sql
done
```

### 4. Build e subida completa

```bash
# Build de todas as imagens (~5 min na primeira vez)
docker compose -f docker-compose.caddy.yml build

# Subir tudo
docker compose -f docker-compose.caddy.yml up -d

# Acompanhar logs — Caddy vai buscar o certificado automaticamente
docker compose -f docker-compose.caddy.yml logs -f caddy
```

Você verá algo como:

```
caddy  | {"level":"info","msg":"certificate obtained successfully","identifier":"nexus.empresa.com"}
caddy  | {"level":"info","msg":"serving initial configuration"}
```

O site já estará em `https://nexus.empresa.com` com certificado válido.

---

## Deploy de nova versão

```bash
cd /opt/nexus2
git pull origin master

# Rebuild apenas o que mudou
docker compose -f docker-compose.caddy.yml build api
docker compose -f docker-compose.caddy.yml build caddy

# Reiniciar sem derrubar o banco
docker compose -f docker-compose.caddy.yml up -d --no-deps api caddy
```

### Atualizar só o frontend (sem rebuild da API)

```bash
docker compose -f docker-compose.caddy.yml build caddy
docker compose -f docker-compose.caddy.yml up -d --no-deps caddy
```

---

## Comandos de manutenção

```bash
# Status
docker compose -f docker-compose.caddy.yml ps

# Logs em tempo real
docker compose -f docker-compose.caddy.yml logs -f
docker compose -f docker-compose.caddy.yml logs -f caddy
docker compose -f docker-compose.caddy.yml logs -f api

# Reiniciar serviço específico
docker compose -f docker-compose.caddy.yml restart api

# Parar tudo (banco persiste no volume)
docker compose -f docker-compose.caddy.yml down

# Parar e remover volumes (⚠️ apaga banco e certificados)
docker compose -f docker-compose.caddy.yml down -v
```

### Verificar certificado SSL

```bash
# Via Caddy CLI dentro do container
docker exec nexus-caddy caddy certificate list

# Ou via curl
curl -sv https://nexus.empresa.com 2>&1 | grep -E "subject|expire|SSL"
```

### Forçar renovação do certificado

```bash
# Caddy renova automaticamente quando faltam 30 dias
# Para forçar manualmente:
docker exec nexus-caddy caddy reload --config /etc/caddy/Caddyfile
```

### Alterar domínio ou configuração do Caddyfile

```bash
# Edite o Caddyfile na raiz do projeto
nano Caddyfile

# Recarregar sem reiniciar o container (zero-downtime)
docker exec nexus-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

---

## Múltiplos domínios / subdomínio da API

Se quiser separar frontend e API em subdomínios diferentes:

```caddyfile
# Frontend
nexus.empresa.com {
    encode zstd gzip
    root * /srv/frontend
    try_files {path} /index.html
    file_server
}

# API
api.nexus.empresa.com {
    reverse_proxy nexus-api:4001
}
```

Neste caso, atualize `VITE_API_URL` para `https://api.nexus.empresa.com/api` no
build do frontend e reconstrua a imagem Caddy.

---

## Modo staging (teste de SSL sem rate limit)

Para testar o pipeline de certificado sem consumir cota do Let's Encrypt:

```caddyfile
{
    # Usar servidor de staging — certificado inválido mas sem limite de requests
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

{$DOMAIN} {
    # ... resto igual
}
```

Remova o bloco `{ acme_ca ... }` quando for para produção real.

---

## Troubleshooting

### Caddy não consegue obter certificado

```bash
docker compose -f docker-compose.caddy.yml logs caddy | grep -i "error\|acme\|certificate"
```

Causas comuns:
- Porta 80 ou 443 bloqueada no firewall da VPS (`sudo ufw status`)
- DNS do domínio não aponta para o IP da VPS (`dig nexus.empresa.com`)
- Certificado já em uso em outro processo na porta 443

### API retorna 502 Bad Gateway

```bash
# Verificar se nexus-api está rodando
docker compose -f docker-compose.caddy.yml ps api
docker compose -f docker-compose.caddy.yml logs api | tail -20

# Testar conectividade direta dentro da rede Docker
docker exec nexus-caddy wget -qO- http://nexus-api:4001/api/health
```

### Frontend mostra tela em branco

```bash
# Verificar se os arquivos estão no lugar certo dentro do container caddy
docker exec nexus-caddy ls /srv/frontend

# Deve listar: index.html, assets/, logo.png, etc.
```

### Portas em uso no host

```bash
sudo ss -tlnp | grep -E ':80|:443'
# Se aparecer nginx: sudo systemctl stop nginx && sudo systemctl disable nginx
```

---

## Volumes e persistência

| Volume | Conteúdo | Impacto se removido |
|---|---|---|
| `postgres_data` | Banco de dados completo | ⚠️ Perda total dos dados |
| `uploads` | Arquivos enviados pelos usuários | ⚠️ Perda dos arquivos |
| `caddy_data` | Certificados Let's Encrypt | Recriados automaticamente |
| `caddy_config` | Cache de configuração Caddy | Recriado automaticamente |
| `caddy_logs` | Logs de acesso | Apenas logs |

**Backup obrigatório antes de qualquer `docker compose down -v`:**

```bash
# Dump do banco
docker exec nexus-postgres pg_dump -U nexus nexus \
  > /opt/backups/nexus_$(date +%Y%m%d_%H%M%S).sql

# Backup dos uploads
tar -czf /opt/backups/uploads_$(date +%Y%m%d).tar.gz \
  $(docker volume inspect nexus2_uploads --format '{{ .Mountpoint }}')
```

---

*Nexus2 — Caddy deployment — 2026-03-16*
