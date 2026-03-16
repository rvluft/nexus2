# Planejamento de Desenvolvimento — Nexus RAG System

**Data:** 2026-03-16
**Stack:** NestJS (backend, porta 4001) + React 19/Vite (frontend) + PostgreSQL 15 + n8n (VPS externa)
**Swagger:** `http://localhost:4001/api/docs`

---

## Status Concluído (pré-fases)

### ✅ Logo do cliente
- Arquivo: `doc/Ampezzo-Contabil-13.png` → copiado para `frontend/public/logo.png`
- Substituído em: `AppSidebar.tsx`, `Login.tsx`, `Dashboard.tsx`

### ✅ Bug criação de usuários (corrigido)
- **Causa 1:** `openEdit` usava `user.role_id` mas o backend retorna `role: { id, name }` — `user.role_id` era `undefined`
- **Causa 2:** String vazia `''` para `role_id` falhava no `@IsUUID()` do NestJS (class-validator ignora `null`/`undefined`, mas não `''`)
- **Fix:** `openEdit` agora usa `user.role?.id || ''`; payload de submissão remove chaves vazias antes do envio

---

## FASE 1 — Sistema de Métricas (conforme RAG - Metricas.md)

### Objetivo
Painel de métricas RAGAS visível na interface — Context Precision, Context Recall, Faithfulness, Answer Relevancy, Context Relevancy.

### Backend

#### Novo módulo: `metrics`

**Tabela necessária:**
```sql
CREATE TABLE nexus.rag_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  context_precision FLOAT,
  context_recall FLOAT,
  faithfulness FLOAT,
  answer_relevancy FLOAT,
  context_relevancy FLOAT,
  avg_score FLOAT,
  sample_size INT,
  notes TEXT,
  created_by UUID REFERENCES nexus.users(id)
);
```

**Novos endpoints:**
| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `GET` | `/api/metrics` | admin/manager | Lista histórico de avaliações |
| `GET` | `/api/metrics/latest` | admin/manager | Última avaliação |
| `POST` | `/api/metrics` | admin | Insere resultado de avaliação manual |
| `POST` | `/api/metrics/webhook` | público (token fixo) | Recebe resultado do workflow n8n |

**Webhook de entrada do n8n** (para automação):
```
POST /api/metrics/webhook
Authorization: Bearer METRICS_WEBHOOK_TOKEN
Body: { context_precision, context_recall, faithfulness, answer_relevancy, context_relevancy, sample_size, notes? }
```

### Frontend

**Nova página:** `frontend/src/pages/Admin/Metrics.tsx`
**Rota:** `/admin/metrics` (visível para admin/manager)

**Componentes:**
- Cards de score atual com indicador de cor (verde ≥0.85, amarelo ≥0.7, vermelho <0.7)
- Gráfico de linha com histórico temporal (últimas 10 avaliações)
- Tabela com histórico completo
- Botão "Disparar avaliação" → aciona webhook n8n

**Thresholds de referência (RAG - Metricas.md):**
- Context Precision: >0.85
- Context Recall: >0.75
- Faithfulness: >0.90
- Answer Relevancy: >0.85
- Context Relevancy: >0.90
- Média geral: >0.85 = pronto para produção

### n8n (instruções de workflow)

Criar workflow: **"RAG Evaluation"**
- Trigger: Webhook ou cron diário
- Nós: HTTP Request (buscar amostra de knowledge_base) → Code (rodar RAGAS via API externa ou Python script) → HTTP Request (POST `/api/metrics/webhook`)
- Alternativa: usar n8n Execute Command para rodar script Python RAGAS

---

## FASE 2 — Implementar Métricas (conforme arquivo MD)

*(Esta fase implementa o monitoramento contínuo descrito na FASE 1, adicionando integração CI/CD e alertas)*

### Adicional à Fase 1:

**Tabela de alertas:**
```sql
CREATE TABLE nexus.metric_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100),
  threshold FLOAT,
  current_value FLOAT,
  message TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Endpoints extras:**
| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `GET` | `/api/metrics/alerts` | admin/manager | Lista alertas não resolvidos |
| `PATCH` | `/api/metrics/alerts/:id/resolve` | admin | Marca alerta como resolvido |

**Lógica de alerta:**
Ao inserir nova avaliação via webhook, o backend verifica cada métrica contra threshold — se abaixo, cria registro em `metric_alerts` e opcionalmente dispara webhook de notificação (WhatsApp via Evolution API ou n8n).

---

## FASE 3 — Gestão de Domínios

### Objetivo
Criar e gerenciar Domínios de Conhecimento (ex: "Contabilidade", "RH", "Jurídico") para categorizar arquivos e chunks.

### Backend

**Tabelas:**
```sql
CREATE TABLE nexus.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#00d4d4',  -- hex para kanban
  icon VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES nexus.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Um arquivo pode pertencer a múltiplos domínios
CREATE TABLE nexus.file_domains (
  file_id UUID REFERENCES nexus.files(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES nexus.domains(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES nexus.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (file_id, domain_id)
);
```

**Endpoints:**
| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `GET` | `/api/domains` | todos | Lista domínios ativos |
| `POST` | `/api/domains` | admin/manager | Cria domínio |
| `PATCH` | `/api/domains/:id` | admin/manager | Atualiza domínio |
| `DELETE` | `/api/domains/:id` | admin | Soft delete |
| `POST` | `/api/domains/:id/files` | admin/manager | Associa arquivo(s) ao domínio |
| `DELETE` | `/api/domains/:id/files/:fileId` | admin/manager | Remove arquivo do domínio |
| `GET` | `/api/domains/:id/files` | todos | Lista arquivos do domínio |

### Frontend
- Nova página: `/admin/domains` (admin/manager)
- CRUD de domínios com picker de cor
- Na página de Arquivos: chip de domínio ao lado do arquivo com possibilidade de atribuir/remover

---

## FASE 4 — Kanban de Arquivos (proc/nproc)

### Objetivo
Visualizar arquivos em formato Kanban por status de processamento (não processado → em processamento → processado → erro).

### Status dos arquivos (já existente na tabela `nexus.files`)
Colunas kanban:
- **`pending`** — aguardando ingestão
- **`processing`** — em processamento no n8n
- **`processed`** — ingestão concluída
- **`error`** — falha na ingestão
- **`reprocessing`** — reprocessamento solicitado

### Frontend

**Nova página:** `frontend/src/pages/Kanban.tsx`
**Rota:** `/kanban` (visível para admin/manager/viewer)

**Implementação:**
- Colunas drag-and-drop com `@dnd-kit/core` (já no ecossistema React — instalar)
- Cards com: nome do arquivo, tamanho, data de upload, domínios, botão de reprocessar
- Atualização de status via drag → `PATCH /api/files/:id` com `{ status: 'nova_coluna' }`
- Polling a cada 30s para atualizar cards em "processing"

**Instalar:**
```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Backend (adição)
Adicionar campo `status` como atualizável via PATCH no `FilesController`:
```
PATCH /api/files/:id  →  body: { status: 'pending' | 'processing' | 'processed' | 'error' }
```

---

## FASE 5 — Gerenciamento de Domínios no Kanban

### Objetivo
Unificar Kanban de arquivos com Domínios de Conhecimento. Drag entre colunas de domínio. Um arquivo pode pertencer a múltiplos domínios.

### Extensão da Fase 4

**Modo dual de visualização no Kanban:**
- **Vista por Status** (Fase 4): colunas = proc/nproc/erro
- **Vista por Domínio** (Fase 5): colunas = cada domínio criado

**Drag entre domínios:**
- Drop em coluna de domínio → POST `/api/domains/:id/files` (adiciona ao domínio)
- Drop "fora" de coluna → DELETE `/api/domains/:id/files/:fileId`
- Arquivo pode aparecer em múltiplas colunas simultaneamente

**Frontend:**
- Toggle "Vista por Status / Vista por Domínio"
- Cards com chips de todos os domínios do arquivo
- Coluna especial "Sem Domínio" para arquivos não categorizados

---

## FASE 5.1 — Especialista por Domínio (WhatsApp)

### Objetivo
Associar um especialista (número WhatsApp) a cada domínio. O AI Agent direciona dúvidas do domínio para esse especialista quando não conseguir responder.

### Backend

**Alterar tabela domains:**
```sql
ALTER TABLE nexus.domains ADD COLUMN expert_name VARCHAR(200);
ALTER TABLE nexus.domains ADD COLUMN expert_whatsapp VARCHAR(20);  -- formato: 5511999999999
ALTER TABLE nexus.domains ADD COLUMN expert_fallback_message TEXT;  -- mensagem padrão de encaminhamento
```

**Endpoints (já cobertos pelo PATCH `/api/domains/:id`)** — apenas campos adicionados.

### n8n (instruções de workflow)

No workflow WhatsApp RAG:
1. Buscar domínio(s) mais relevante(s) via PostgreSQL
2. Verificar `expert_whatsapp` do domínio
3. Se `faithfulness` baixo ou confiança < threshold → encaminhar para especialista:
   ```
   "Essa dúvida é do domínio [NOME]. O especialista responsável é [NOME].
   Para atendimento direto, contate: wa.me/[NUMERO]"
   ```
4. Se domínio não tem especialista → resposta padrão do AI

---

## FASE 6 — Gestão de Grupo WhatsApp (número ignorado pelo AI)

### Objetivo
Cadastrar número(s) de funcionários que participam do grupo WhatsApp mas NÃO devem receber resposta do AI Agent. O AI ignora mensagens desses números.

### Backend

**Nova tabela:**
```sql
CREATE TABLE nexus.whatsapp_ignored_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number VARCHAR(20) NOT NULL UNIQUE,  -- formato: 5511999999999
  description VARCHAR(200),            -- ex: "João - Funcionário"
  created_by UUID REFERENCES nexus.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Endpoints:**
| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `GET` | `/api/whatsapp/ignored-numbers` | admin/manager | Lista números ignorados |
| `POST` | `/api/whatsapp/ignored-numbers` | admin | Adiciona número |
| `DELETE` | `/api/whatsapp/ignored-numbers/:id` | admin | Remove número |

### Frontend
- Nova seção em `/admin/automation` ou nova página `/admin/whatsapp`
- Tabela com números cadastrados + formulário de adição

### n8n — Instrução de modificação no workflow WhatsApp

No início do workflow WhatsApp (após receber mensagem), adicionar nó:

**1. HTTP Request** — buscar números ignorados:
```
GET https://[SEU_BACKEND]/api/whatsapp/ignored-numbers
Headers: Authorization: Bearer [TOKEN_ADMIN]
```

**2. Code Node** — verificar se remetente está na lista:
```javascript
const ignoredNumbers = $input.first().json;
const senderNumber = $('Webhook').first().json.body.data.key.remoteJid.replace('@s.whatsapp.net', '');
const shouldIgnore = ignoredNumbers.some(item => item.number === senderNumber);

if (shouldIgnore) {
  // Parar workflow sem responder
  return [{ json: { ignore: true, reason: 'number_in_blocklist' } }];
}
return [{ json: { ignore: false, senderNumber } }];
```

**3. IF Node** — `{{ $json.ignore === true }}` → branch "Sim" termina sem resposta; branch "Não" continua para o AI Agent.

> **Membros do grupo:** A Evolution API permite listar participantes via `GET /group/participants/{groupId}`. Se desejar implementar, o endpoint é acessível mas a interface de gerenciamento não é prioritária agora.

---

## FASE 7 — Disparo de Ingestão via Webhook

### Objetivo
Botão na interface (ou endpoint HTTP) que dispara o workflow de ingestão do n8n, que hoje só roda via trigger manual ou cron.

### n8n — Modificar workflow de ingestão

Adicionar **Webhook Trigger** ao workflow existente de ingestão:
- Método: `POST`
- Path: `ingest-trigger` (ou nome de sua preferência)
- Autenticação: Header Auth ou Basic Auth
- URL resultante: `https://[SEU_N8N]/webhook/ingest-trigger`

O webhook pode receber body opcional:
```json
{
  "file_id": "uuid-opcional",    // processar arquivo específico
  "force_reprocess": false        // forçar reprocessamento de já processados
}
```

### Backend

**Endpoint:**
| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `POST` | `/api/n8n/trigger-ingestion` | admin/manager | Dispara webhook de ingestão no n8n |

**Implementação em `n8n.service.ts`:**
```typescript
async triggerIngestion(payload?: { file_id?: string; force_reprocess?: boolean }) {
  const webhookUrl = this.configService.get('N8N_INGESTION_WEBHOOK_URL');
  const token = this.configService.get('N8N_WEBHOOK_TOKEN');
  return this.httpService.post(webhookUrl, payload || {}, {
    headers: { Authorization: `Bearer ${token}` }
  }).toPromise();
}
```

**Variáveis de ambiente a adicionar:**
```env
N8N_INGESTION_WEBHOOK_URL=https://[SEU_N8N]/webhook/ingest-trigger
N8N_WEBHOOK_TOKEN=seu-token-secreto
```

### Frontend

Adicionar na página `/admin/automation` (já existente) um segundo botão:
```
[⚡ Disparar fluxo n8n]    [🔄 Disparar Ingestão]
```

---

## Resumo de Todos os Endpoints

### Existentes
| Rota | Método | Acesso |
|------|--------|--------|
| `/api/auth/login` | POST | público |
| `/api/auth/register` | POST | público |
| `/api/auth/me` | GET | JWT |
| `/api/users` | GET/POST | admin/manager |
| `/api/users/:id` | GET/PATCH/DELETE | admin |
| `/api/files` | GET/POST | JWT |
| `/api/files/:id` | GET/DELETE | JWT |
| `/api/files/:id/reprocess` | POST | JWT |
| `/api/knowledge` | GET/POST | JWT |
| `/api/knowledge/:id` | GET/PATCH/DELETE | admin/manager |
| `/api/ingestion` | GET | JWT |
| `/api/ingestion/:id` | GET | JWT |
| `/api/audit` | GET | admin/manager |
| `/api/n8n/trigger-admin-flow` | POST | admin/manager |
| `/api/health` | GET | público |

### Novos (todas as fases)
| Rota | Método | Fase | Acesso |
|------|--------|------|--------|
| `/api/metrics` | GET/POST | 1/2 | admin/manager |
| `/api/metrics/latest` | GET | 1/2 | admin/manager |
| `/api/metrics/webhook` | POST | 1/2 | token fixo |
| `/api/metrics/alerts` | GET | 2 | admin/manager |
| `/api/metrics/alerts/:id/resolve` | PATCH | 2 | admin |
| `/api/domains` | GET/POST | 3 | admin/manager |
| `/api/domains/:id` | PATCH/DELETE | 3 | admin/manager |
| `/api/domains/:id/files` | GET/POST | 3/5 | admin/manager |
| `/api/domains/:id/files/:fileId` | DELETE | 3/5 | admin/manager |
| `/api/whatsapp/ignored-numbers` | GET/POST | 6 | admin/manager |
| `/api/whatsapp/ignored-numbers/:id` | DELETE | 6 | admin |
| `/api/n8n/trigger-ingestion` | POST | 7 | admin/manager |

---

## Rotas Frontend (React Router)

### Existentes
| Rota | Componente | Acesso |
|------|-----------|--------|
| `/login` | Login.tsx | público |
| `/` | Dashboard.tsx | JWT |
| `/files` | Files.tsx | JWT |
| `/knowledge` | Knowledge.tsx | JWT |
| `/admin/users` | Admin/Users.tsx | admin/manager |
| `/admin/apis` | Admin/Apis.tsx | admin |
| `/admin/audit` | Admin/AuditLogs.tsx | admin/manager |
| `/admin/automation` | Admin/Automation.tsx | admin/manager |

### Novas
| Rota | Componente | Fase | Acesso |
|------|-----------|------|--------|
| `/admin/metrics` | Admin/Metrics.tsx | 1/2 | admin/manager |
| `/admin/domains` | Admin/Domains.tsx | 3 | admin/manager |
| `/kanban` | Kanban.tsx | 4/5 | todos |
| `/admin/whatsapp` | Admin/Whatsapp.tsx | 6 | admin/manager |

---

## Infraestrutura de Deploy (VPS)

### Variáveis de ambiente a adicionar
```env
# Métricas
METRICS_WEBHOOK_TOKEN=gerar-com-openssl-rand-hex-32

# n8n Webhooks (VPS)
N8N_BASE_URL=https://[SEU_N8N_VPS]
N8N_INGESTION_WEBHOOK_URL=https://[SEU_N8N_VPS]/webhook/ingest-trigger
N8N_WEBHOOK_TOKEN=gerar-com-openssl-rand-hex-32
```

### Migrations SQL necessárias (por fase)
1. `migration_fase1_metrics.sql` — tabela `rag_metrics`
2. `migration_fase2_alerts.sql` — tabela `metric_alerts`
3. `migration_fase3_domains.sql` — tabelas `domains`, `file_domains`
4. `migration_fase5_domains_experts.sql` — colunas `expert_*` em `domains`
5. `migration_fase6_whatsapp.sql` — tabela `whatsapp_ignored_numbers`

---

## Dependências Frontend a Instalar

```bash
# Fase 4/5 — Kanban drag-and-drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Fase 1/2 — Gráficos de métricas (opcional, alternativa ao CSS puro)
npm install recharts
```

---

## Ordem de Implementação Recomendada

```
Fase 3 → Fase 4 → Fase 5 → Fase 5.1 → Fase 7 → Fase 1 → Fase 2 → Fase 6
```

**Motivo:** Domínios (Fase 3) são base do Kanban (4/5). Ingestão via webhook (7) é simples e desbloqueia testes. Métricas (1/2) requerem dados reais de uso. WhatsApp (6) é independente e pode ser feito a qualquer momento.
