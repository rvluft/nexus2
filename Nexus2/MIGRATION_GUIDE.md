# Migration Guide — De PHP/MySQL para NestJS/Postgres

## 📋 Contexto

Projeto anterior: `/Nexus` (PHP/Lumen + MySQL)
Novo projeto: `/Nexus2` (NestJS + PostgreSQL)

### Diferenças principais

| Aspecto | Antigo (PHP) | Novo (NestJS) |
|---------|--------------|---------------|
| Framework | Lumen (PHP) | NestJS (TypeScript) |
| Banco | MySQL | PostgreSQL |
| Frontend | React caótico (múltiplas portas) | React limpo (Vite) |
| Padrão | Fora do padrão Lumen | Alinhado com Lumen_CRM |
| Autenticação | JWT (custom) | Passport/JWT (standard) |
| RBAC | Parcial | Completo (roles + permissions) |
| Auditoria | Inexistente | Interceptor global |

---

## 🗂️ Estrutura de Dados (MySQL → PostgreSQL)

### Tabelas equivalentes

| MySQL (antigo) | PostgreSQL (novo) | Observações |
|----------------|-------------------|-------------|
| `users` | `nexus.users` | Mesma estrutura + `deleted_at` |
| `files` | `nexus.files` | Mesma + soft delete + `deleted_by` |
| `knowledge_base` | `nexus.knowledge_base` | Mesma + `deleted_at`, `deleted_by` |
| N/A | `nexus.roles` | Nova tabela para RBAC |
| N/A | `nexus.permissions` | Permissões granulares |
| N/A | `nexus.role_permissions` | Relação many-to-many |
| N/A | `nexus.ingestion_jobs` | Nova (rastreia jobs n8n) |
| N/A | `nexus.audit_logs` | Nova (logs automáticos) |

### Migração de dados

Se houver dados importantes no MySQL antigo, converter:

```sql
-- 1. Exportar MySQL
mysqldump -u root -p nexus_old > nexus_old.sql

-- 2. Converter para PostgreSQL (ajustar tipos, escape, etc)
-- Use ferramenta: https://www.convertcsv.com/mysql-to-postgresql.htm
-- Ou script custom em Python/Node

-- 3. Importar no novo schema
psql -U postgres -d nexus_new -f converted_data.sql
```

**Importante**:
- Senhas são hash bcrypt (compatível, manter).
- UUIDs devem ser mantidos (mesmo formato).
- `created_at`/`updated_at`: ajustar timezone se necessário.
- Soft delete: se antigo não tinha, deixar `deleted_at = NULL`.

---

## 🔄 Workflow de Transição

### Fase 1: Paralelo (desenvolvimento)

1. Manter sistema antigo em produção (PHP/MySQL)
2. Desenvolver novo sistema (`Nexus2`) localmente
3. Testar com dados de teste
4. Validar funcionalidades com usuário

### Fase 2: Staging (segurança)

1. Deploy em ambiente de staging (VPS separado)
2. Testar integração com n8n real
3. Validar workflows de ingestão
4. Testes de carga e segurança
5. Aprovação de segurança

### Fase 3: Produção (cutover)

1. Fazer backup do MySQL antigo
2. Migrar dados para PostgreSQL (script custom)
3. Parar sistema antigo (ou manter modo read-only)
4. Deploy do Nexus2 em produção
5. Atualizar DNS (se domínio mudar)
6. Monitorar logs
7. Desativar sistema antigo após 30 dias

---

## 🔐 Considerações de Segurança

### Antes de Production

- [ ] Trocar `JWT_SECRET` (64+ chars aleatórios)
- [ ] Trocar senha do admin (`admin@nexus.local`)
- [ ] Configurar HTTPS (nginx + Let's Encrypt)
- [ ] Firewall: apenas portas 80/443 abertas
- [ ] Backups automáticos do PostgreSQL (WAL + dump diário)
- [ ] Monitoramento (logs, metrics, uptime)
- [ ] Rate limiting (em breve)
- [ ] Scan de vulnerabilidades (npm audit, Snyk)

### Dados sensíveis

- Senhas: bcrypt (12 rounds) — OK
- JWT: assinatura HMAC — usar segredo forte
- Logs de auditoria: não incluir senhas, tokens
- IPs: armazenar apenas para auditoria (LGPD)
- Arquivos: storage local ou S3 (com acesso controlado)

---

## 📦 Implantação em Produção (VPS)

### 1. Preparar servidor

```bash
# Instalar Docker + Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Clone do repositório
git clone <repo> /opt/nexus
cd /opt/nexus
```

### 2. Configurar variáveis

```bash
cp .env.example .env
# Editar .env com valores de produção
```

### 3. Banco de dados

```bash
# Criar banco PostgreSQL (supabase/postgres já vem)
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 30

# Executar schema
docker-compose -f docker-compose.prod.yml exec postgres psql -U nexus -d nexus -f /docker-entrypoint-initdb.d/init.sql

# OU se banco externo:
psql -U postgres -d nexus_prod -f scripts/init.sql
```

### 4. Deploy

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Nginx proxy

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://nexus-frontend-prod:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://nexus-api-prod:4001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6. Testar

- Acessar https://seu-dominio.com
- Login: admin@nexus.local / Admin@123456
- Trocar senha imediatamente

---

## 🧪 Testes de Aceitação

### Funcionalidades críticas

- [ ] Login/logout
- [ ] Upload de arquivo (PDF, DOCX, XLSX, TXT)
- [ ] Listagem de arquivos com filtros
- [ ] Reprocessamento de arquivo com erro
- [ ] Visualização de base de conhecimento
- [ ] Edição de item de conhecimento
- [ ] Listagem de usuários (admin)
- [ ] Logs de auditoria aparecem
- [ ] Health check retorna 200

### Integração n8n

- [ ] Upload de arquivo → n8n recebe webhook (ou lê do Drive)
- [ ] Job status muda de `uploaded` → `processing` → `processed`/`error`
- [ ] Google Drive workflow processa arquivo
- [ ] Conteúdo aparece na base de conhecimento

---

## 📝 Após Deploy

### 1. Alterar senha do admin

```sql
-- Gerar novo hash
node scripts/generate-hash.js 'NovaSenhaForte123'

-- Atualizar no banco
UPDATE nexus.users SET password_hash = '$2b$12$...' WHERE email = 'admin@nexus.local';
```

### 2. Criar usuários iniciais

Via UI ou SQL:
```sql
INSERT INTO nexus.users (email, name, password_hash, role_id, is_active)
VALUES (
  'manager@lumen.com',
  'Manager',
  '<hash>',
  (SELECT id FROM nexus.roles WHERE name = 'manager'),
  true
);
```

### 3. Configurar n8n

- Workflow de ingestão já deve estar funcionando
- Ajustar `N8N_BASE_URL` se necessário
- Testar webhook de callback (opcional)

### 4. Monitoramento

```bash
# Logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f frontend

# Health
./scripts/health-check.sh
```

---

## 🆘 Suporte

Em caso de problemas:

1. Verificar logs (`docker-compose logs`)
2. Testar API diretamente (`curl http://localhost:4001/health`)
3. Verificar banco (`docker-compose exec postgres psql -U nexus -d nexus`)
4. Consultar troubleshoot no README

---

**Boa migração!** 🚀
