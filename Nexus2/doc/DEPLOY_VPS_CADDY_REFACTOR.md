# Nexus2 — Refatoração de Deploy para Caddy (DEV -> VPS)

Objetivo: adaptar o deploy descrito em `DEPLOY_VPS.md` (Nginx) para o ambiente real da VPS (Caddy já em produção), com risco mínimo e rollback rápido.

---

## Estratégia recomendada

1. Refatorar no **DEV**
2. Validar com smoke tests
3. Publicar na **VPS** em janela curta
4. Ter rollback pronto (1-2 comandos)

---

## 1) Escopo da refatoração

### Substituir no modelo
- Remover dependência de Nginx no deploy do Nexus2
- Usar Caddy como reverse proxy TLS
- Ajustar portas internas dos serviços para loopback (evitar exposição pública)

### Padrão de roteamento (Caddy)
- `nexus.seu-dominio.com` -> frontend
- `nexus.seu-dominio.com/api/*` -> backend
- `nexus.seu-dominio.com/storage/*` -> backend storage
- `n8n.seu-dominio.com` -> n8n (já existente)

---

## 2) DEV — checklist técnico

## 2.1 Docker Compose (prod)
Garantir (exemplo):
- backend em `127.0.0.1:4100` (container 4001)
- frontend em `127.0.0.1:5100` (container 80)
- postgres sem exposição pública

## 2.2 Variáveis de ambiente
Backend (`backend/.env`):
- `API_PUBLIC_URL=https://nexus.seu-dominio.com`
- `FRONTEND_URL=https://nexus.seu-dominio.com`
- `N8N_BASE_URL=https://n8n.seu-dominio.com`
- tokens JWT/webhook definidos e fortes

Compose raiz (`.env`):
- segredos sincronizados com backend

## 2.3 Caddyfile (template DEV)
```caddy
nexus.seu-dominio.com {
  encode zstd gzip

  @api path /api/*
  handle @api {
    reverse_proxy 127.0.0.1:4100
  }

  @storage path /storage/*
  handle @storage {
    reverse_proxy 127.0.0.1:4100
  }

  handle {
    reverse_proxy 127.0.0.1:5100
  }
}
```

## 2.4 Smoke tests DEV
- `curl -I https://nexus.seu-dominio.com`
- `curl -i https://nexus.seu-dominio.com/api/health`
- upload e download em `/storage/...`
- login admin
- webhook n8n callback (teste manual)

---

## 3) VPS — plano de execução (janela curta)

1. Backup de configs:
   - `cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.$(date +%Y%m%d-%H%M%S)`
2. Subir/atualizar containers Nexus
3. Aplicar bloco do domínio Nexus no Caddyfile
4. `caddy validate --config /etc/caddy/Caddyfile`
5. `systemctl reload caddy`
6. Rodar smoke tests de produção

---

## 4) Rollback imediato

Se qualquer teste falhar:

1. Restaurar Caddyfile backup
2. `systemctl reload caddy`
3. Reverter versão de containers (`docker compose ... up -d` com tag anterior)

Tempo alvo de rollback: < 3 minutos.

---

## 5) Critérios de pronto (Go/No-Go)

Go apenas se:
- API health OK
- frontend renderizando
- autenticação OK
- upload/storage OK
- callback n8n OK
- logs sem 5xx contínuo por 10-15 min

---

## 6) Observações do servidor atual

- Caddy já está ativo em `:80` e `:443`
- Nginx instalado, mas **não deve ser usado** em paralelo com Caddy
- deploy atual possui múltiplos serviços; manter isolamento por host/path

---

## 7) Próximo passo operacional

Implementar no repositório do Nexus2:
1. `docker-compose.prod.yml` alinhado ao Caddy
2. `.env.example` de produção revisado
3. `Caddyfile.nexus.example`
4. script `scripts/deploy-prod.sh` idempotente com smoke test + rollback

