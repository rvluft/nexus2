# Deploy Checklist — Nexus

Antes de colocar em produção, verificar **TODOS** os itens abaixo.

---

## 🛡️ Segurança

### Ambiente
- [ ] `JWT_SECRET` configurado com 64+ chars aleatórios (`openssl rand -hex 64`)
- [ ] Senha do admin trocada (não usar `Admin@123456`)
- [ ] Banco de dados com senha forte (não `nexus`)
- [ ] `.env` NÃO commitado no git
- [ ] Docker secrets (ou Kubernetes secrets) para senhas

### Aplicação
- [ ] HTTPS habilitado (nginx + Let's Encrypt)
- [ ] Firewall: apenas portas 80/443 abertas
- [ ] CORS configurado apenas para domínio do frontend
- [ ] Rate limiting implementado (ou em planejamento)
- [ ] Headers de segurança no nginx
- [ ] Logs não exponham dados sensíveis (senhas, tokens)
- [ ] Auditoria funcionando (toda ação logada)

---

## 🗄️ Banco de Dados

- [ ] PostgreSQL 15+ instalado (com pgvector se for usar busca vetorial)
- [ ] Schema `nexus` criado via `scripts/init.sql`
- [ ] Senha do banco forte
- [ ] Backups automáticos configurados (WAL + dump diário)
- [ ] Teste de restore funcionando
- [ ] Conexão SSL ao banco (recomendado)
- [ ] Índices criados (ver的计划 de índices no init.sql)

---

## 🐳 Docker

### Imagens
- [ ] Imagens construídas para produção
  ```bash
  docker-compose -f docker-compose.prod.yml build
  ```
- [ ] Tags sem `latest` (usar versão semântica: `nexus-api:1.0.0`)

### Volumes
- [ ] Volumes persistidos:
  - `postgres_data` (banco)
  - `/app/storage` (uploads)
  - `/app/logs` (logs da aplicação)
- [ ] Backups dos volumes configurados

### Health
- [ ] Health check da API retorna 200 (`/health`)
- [ ] Health check do PostgreSQL (`pg_isready`)
- [ ] Restart policy configurado (`unless-stopped`)

---

## 🌐 Rede

### Firewall
- [ ] Apenas portas 80 (HTTP) e 443 (HTTPS) abertas ao público
- [ ] Portas internas (5432, 4001) bloqueadas externamente
- [ ] SSH com chave pública (senha desabilitada)

### Nginx
- [ ] Proxy reverso configurado:
  - `/` → frontend (porta 80/443)
  - `/api` → backend (porta 4001 interna)
- [ ] HTTPS com certificado válido (Let's Encrypt)
- [ ] HTTP redireciona para HTTPS
- [ ] Gzip habilitado
- [ ] Cache estático configurado (JS, CSS, imagens)

---

## 📱 n8n Integração

### Workflows
- [ ] Workflow de ingestão (`LhxtBhFyg76BIala`) funcionando
- [ ] Workflow WhatsApp (`c7d9zdonIxWPpZSf`) funcionando
- [ ] Credenciais do Google Drive válidas
- [ ] Pasta "Nao_Processados" existe e está sendo monitorada
- [ ] Supabase/pgvector configurado (se for usar busca)

### Communication
- [ ] API consegue chamar n8n (se necessário)
- [ ] n8n consegue chamar API callbacks (opcional)
- [ ] Webhooks configurados corretamente

---

## 🧪 Testes de Aceitação

### Autenticação
- [ ] Login com admin@nexus.local / (nova senha)
- [ ] Logout funciona
- [ ] Token expira após 15min
- [ ] Acesso sem token retorna 401

### RBAC
- [ ] Admin vê todos os menus
- [ ] Manager vê apenas files, knowledge, ingestion, audit
- [ ] Viewer vê apenas leitura
- [ ] Manager pode criar usuários (admin only?)

### Files
- [ ] Upload de arquivo (PDF, DOCX, XLSX, TXT) funciona
- [ ] Arquivo aparece na listagem
- [ ] Status inicial: `uploaded`
- [ ] Reprocessamento funciona (muda status para `pending`)
- [ ] Deleção funciona (soft delete)

### Ingestion
- [ ] Job criado após upload
- [ ] Status muda para `processing` (n8n pega)
- [ ] Após processamento: `completed` ou `error`
- [ ] Logs de erro aparecem se falhar

### Knowledge
- [ ] Itens aparecem após ingestão (ou manual)
- [ ] Busca por texto funciona
- [ ] Edição de item funciona
- [ ] Deleção funciona (soft delete)

### Audit
- [ ] Toda ação logada (upload, delete, login, etc)
- [ ] Logs mostram usuário, IP, timestamp
- [ ] Filtros funcionam (user, action, date)

---

## 📊 Monitoramento

### Logs
- [ ] Logs da API estruturados (JSON)
- [ ] Logs do frontend (nginx) capturados
- [ ] Rotação de logs configurada (logrotate ou similar)
- [ ] Alertas para erros críticos ( Slack/Email )

### Métricas
- [ ] Health check retorna uptime, memória
- [ ] Métricas de requests (se implementado)
- [ ] Database connection pool monitorado

### Backup
- [ ] Backup completo diário (arquivos + banco)
- [ ] Retention policy (30 dias?)
- [ ] Teste de restore semanal

---

## 🚀 Go-Live

### Pré-start
- [ ] Domínio configurado e apontando para VPS
- [ ] Certificado SSL instalado (Let's Encrypt)
- [ ] DNS propagado
- [ ] `.env` produção preenchido
- [ ] Senha do admin trocada
- [ ] Backup do banco (antes de migrar dados)

### Start
- [ ] `docker-compose -f docker-compose.prod.yml up -d`
- [ ] Todos containers `healthy` ou `running`
- [ ] `docker-compose ps` mostra tudo OK
- [ ] Health check retorna 200

### Validação
- [ ] Acessar site (HTTPS) — carrega
- [ ] Login funciona
- [ ] Upload de arquivo funciona
- [ ] n8n processa arquivo (verificar job status)
- [ ] Conteúdo aparece na base de conhecimento
- [ ] Logs de auditoria sendo gerados

### Pós-start
- [ ] Monitorar logs por 1 hora
- [ ] Verificar uso de CPU/memória
- [ ] Testar恢复 (reiniciar containers)
- [ ] Comunicar equipe sobre novo sistema

---

## 📞 Suporte

Em caso de problemas:

1. **Checklist**: Passar por este checklist novamente
2. **Logs**: `docker-compose -f docker-compose.prod.yml logs -f`
3. **Health**: `./scripts/health-check.sh`
4. **Banco**: conectar e verificar tabelas
5. **n8n**: verificar executions e webhooks

---

**Data**: _____________
**Responsável**: _____________
**Status**: ☐ Em andamento / ☐ Concluído
