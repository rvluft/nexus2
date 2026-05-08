# PRD — Central de Memória Operacional para IA

## 1. Objetivo do projeto

Desenvolver uma aplicação web para organizar, consultar, revisar e retroalimentar memórias operacionais usadas por assistentes de IA, especialmente Claude.

A aplicação não deve ser apenas um app de notas. Deve funcionar como uma **central de memória estruturada**, permitindo que um ser humano mantenha informações confiáveis, versionadas e recuperáveis por projeto.

O objetivo principal é melhorar o desempenho do Claude em tarefas recorrentes por meio de:

- registro de decisões já tomadas;
- reaproveitamento de prompts aprovados;
- reaproveitamento de códigos e parsers já desenvolvidos;
- registro de erros e soluções;
- criação de lições aprendidas;
- organização de contexto por projeto;
- busca semântica e textual sobre memórias curadas;
- futura integração via API/MCP para o Claude consultar a memória.

---

## 2. Problema que o sistema resolve

Hoje, desenvolvimentos, decisões, prompts, soluções e aprendizados ficam espalhados em conversas, arquivos soltos, notas e histórico mental.

Isso causa problemas como:

- repetir soluções já feitas;
- esquecer decisões importantes;
- reconstruir prompts do zero;
- perder padrões técnicos já validados;
- misturar ideias antigas com decisões atuais;
- o Claude responder sem conhecer o histórico real dos projetos;
- dificuldade de saber qual informação está vigente, rascunho ou obsoleta.

O sistema deve resolver isso criando uma memória humana e computacionalmente organizada.

---

## 3. Conceito central

A aplicação deve trabalhar com o conceito de **memórias estruturadas**.

Uma memória é um registro curado contendo:

- projeto;
- tipo;
- título;
- conteúdo;
- status;
- prioridade;
- tags;
- origem;
- histórico de versões;
- data de criação e atualização.

Exemplo:

```text
Projeto: Born Sales
Tipo: Decisão
Título: Fonte oficial PDF/DWG
Status: Vigente
Prioridade: Alta
Tags: pdf, dwg, algoritmo-hungaro
Conteúdo:
O PDF é a fonte oficial para saber quais pilares existem. O DWG é a fonte oficial para posições geométricas. A conciliação deve usar matching global, preferencialmente algoritmo Húngaro.
```

---

## 4. Princípios do produto

### 4.1 Memória curada é melhor que memória gigante

O sistema não deve simplesmente indexar tudo sem critério. O foco é permitir que o usuário salve informações úteis, revise, aprove e marque o que está vigente.

### 4.2 Separar verdade atual de histórico

Toda memória deve ter status claro:

- vigente;
- rascunho;
- obsoleto;
- referência.

Por padrão, buscas e contexto para IA devem priorizar memórias vigentes.

### 4.3 Projeto é o eixo principal

A navegação principal deve ser por projeto. Exemplos:

- Born Sales;
- Adharas;
- SDR Imobiliário;
- OpenClaw;
- Biblioteca IA;
- Infraestrutura Debian.

### 4.4 Tipos de memória são fundamentais

O sistema deve classificar memórias por tipo:

- contexto;
- decisão;
- regra;
- prompt;
- código;
- erro;
- solução;
- proposta;
- cliente;
- histórico;
- referência;
- lição aprendida.

### 4.5 O humano é o editor-chefe da memória

A IA pode sugerir, resumir e classificar, mas o humano deve conseguir revisar e controlar o que fica vigente.

---

## 5. Stack sugerida

### 5.1 Frontend

Usar:

- Next.js;
- React;
- TypeScript;
- TailwindCSS;
- shadcn/ui;
- React Hook Form;
- Zod;
- TanStack Query.

### 5.2 Backend

Opções aceitáveis:

#### Opção preferida para MVP integrado

- Next.js App Router;
- Server Actions ou API Routes;
- Prisma ORM;
- PostgreSQL.

#### Opção alternativa

- FastAPI;
- PostgreSQL;
- frontend separado em Next.js.

Para simplicidade inicial, implementar com Next.js full-stack.

### 5.3 Banco de dados

Usar PostgreSQL.

Preparar arquitetura para futura adição de pgvector, mas o MVP pode começar sem embedding.

### 5.4 Busca

Fase 1:

- busca textual com PostgreSQL `ILIKE` ou full-text search.

Fase 2:

- adicionar pgvector para busca semântica.

Fase 3:

- busca híbrida: textual + semântica + filtros.

---

## 6. Entidades principais

### 6.1 Project

Representa um projeto ou área de trabalho.

Campos:

```ts
type Project = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status: 'ativo' | 'pausado' | 'arquivado';
  ai_summary?: string;
  created_at: Date;
  updated_at: Date;
};
```

### 6.2 Memory

Representa uma memória estruturada.

Campos:

```ts
type Memory = {
  id: string;
  project_id: string;
  type: MemoryType;
  title: string;
  content: string;
  status: MemoryStatus;
  priority: MemoryPriority;
  tags: string[];
  source?: string;
  confidence: 'baixa' | 'media' | 'alta';
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};
```

Enums:

```ts
type MemoryType =
  | 'contexto'
  | 'decisao'
  | 'regra'
  | 'prompt'
  | 'codigo'
  | 'erro'
  | 'solucao'
  | 'proposta'
  | 'cliente'
  | 'historico'
  | 'referencia'
  | 'licao_aprendida';

type MemoryStatus =
  | 'vigente'
  | 'rascunho'
  | 'obsoleto'
  | 'referencia';

type MemoryPriority =
  | 'baixa'
  | 'media'
  | 'alta'
  | 'critica';
```

### 6.3 MemoryVersion

Representa histórico de versões de uma memória.

Campos:

```ts
type MemoryVersion = {
  id: string;
  memory_id: string;
  title: string;
  content: string;
  status: MemoryStatus;
  priority: MemoryPriority;
  tags: string[];
  created_at: Date;
};
```

### 6.4 InboxItem

Representa itens ainda não classificados.

Campos:

```ts
type InboxItem = {
  id: string;
  raw_content: string;
  suggested_project_id?: string;
  suggested_type?: MemoryType;
  status: 'pendente' | 'convertido' | 'descartado';
  source?: string;
  created_at: Date;
};
```

---

## 7. Modelo SQL inicial

Usar UUIDs.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  ai_summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'vigente',
  priority TEXT NOT NULL DEFAULT 'media',
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT,
  confidence TEXT NOT NULL DEFAULT 'alta',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_content TEXT NOT NULL,
  suggested_project_id UUID REFERENCES projects(id),
  suggested_type TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  source TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_memories_project_id ON memories(project_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_status ON memories(status);
CREATE INDEX idx_memories_priority ON memories(priority);
CREATE INDEX idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX idx_memories_content_search ON memories USING GIN(to_tsvector('portuguese', title || ' ' || content));
```

---

## 8. Estrutura de navegação

### 8.1 Layout principal

Usar layout de 3 colunas em desktop:

```text
┌───────────────┬────────────────────────────┬────────────────────┐
│ Projetos      │ Lista de memórias          │ Detalhe / Editor   │
│               │                            │                    │
│ Born Sales    │ [Decisão] PDF/DWG          │ Título             │
│ Adharas       │ [Regra] Banho cães         │ Conteúdo           │
│ OpenClaw      │ [Erro] Rate limit          │ Metadados          │
│ SDR           │ [Prompt] Classificador     │ Histórico          │
└───────────────┴────────────────────────────┴────────────────────┘
```

Em telas menores, usar navegação em páginas separadas.

### 8.2 Menu lateral

Itens:

- Dashboard;
- Projetos;
- Memórias;
- Inbox;
- Memórias críticas;
- Busca;
- Prompts;
- Erros e soluções;
- Configurações.

---

## 9. Telas do MVP

## 9.1 Dashboard

Objetivo: visão geral da memória.

Elementos:

- campo de busca global;
- cards de projetos ativos;
- contagem de memórias por status;
- memórias críticas recentes;
- últimas atualizações;
- itens pendentes na inbox.

Exemplo visual:

```text
Memória IA

[Buscar em toda memória...]

Projetos ativos
[Born Sales]        42 memórias   8 críticas
[Adharas]           61 memórias   12 críticas
[OpenClaw]          29 memórias   5 críticas
[SDR Imobiliário]   34 memórias   3 críticas

Pendências
- 7 itens na Inbox
- 3 memórias em rascunho
- 2 possíveis obsoletas
```

## 9.2 Lista de projetos

Exibir projetos em cards ou tabela.

Cada projeto deve mostrar:

- nome;
- descrição curta;
- status;
- quantidade de memórias;
- quantidade de memórias críticas;
- última atualização.

Ações:

- criar projeto;
- editar projeto;
- arquivar projeto;
- abrir projeto.

## 9.3 Página do projeto

A página do projeto deve ter abas:

- Visão Geral;
- Decisões;
- Regras;
- Prompts;
- Códigos;
- Erros/Soluções;
- Lições Aprendidas;
- Histórico;
- Todas.

### Visão Geral

Mostrar:

- descrição do projeto;
- resumo para IA;
- memórias críticas;
- decisões vigentes;
- prompts ativos;
- erros resolvidos importantes;
- últimas alterações.

O campo `ai_summary` deve ser editável.

## 9.4 Lista de memórias

Exibir memórias em cards ou tabela compacta.

Cada item deve mostrar:

- tipo;
- título;
- status;
- prioridade;
- tags;
- trecho inicial do conteúdo;
- data de atualização.

Filtros obrigatórios:

- projeto;
- tipo;
- status;
- prioridade;
- tags;
- texto livre.

Ordenação:

- mais recentes;
- prioridade;
- tipo;
- título.

## 9.5 Editor de memória

Campos:

- projeto;
- tipo;
- título;
- conteúdo;
- status;
- prioridade;
- tags;
- fonte;
- confiança;
- metadata JSON opcional.

O conteúdo deve aceitar Markdown.

Ações:

- salvar;
- salvar nova versão;
- marcar como vigente;
- marcar como obsoleto;
- duplicar;
- excluir;
- copiar contexto;
- ver versões.

Ao salvar uma edição importante, criar registro em `memory_versions` com a versão anterior.

## 9.6 Inbox

Objetivo: capturar informações soltas antes de virarem memórias oficiais.

Tela deve permitir:

- adicionar texto bruto;
- listar itens pendentes;
- converter item em memória;
- sugerir projeto/tipo manualmente;
- descartar item.

Fluxo:

1. Usuário cola um texto bruto.
2. Sistema salva como `inbox_item`.
3. Usuário clica em “Converter em memória”.
4. Sistema abre formulário de memória com conteúdo preenchido.
5. Usuário escolhe projeto, tipo, status, prioridade e tags.
6. Ao salvar, item vira `convertido`.

## 9.7 Memórias críticas

Tela global mostrando todas as memórias com prioridade `critica` ou `alta`.

Filtros:

- projeto;
- tipo;
- status.

Objetivo: permitir revisão rápida do que a IA nunca deve esquecer.

## 9.8 Busca global

Busca em todos os projetos.

Campos:

- busca textual;
- filtros por projeto, tipo, status, prioridade e tags.

Resultado deve mostrar:

- título;
- projeto;
- tipo;
- status;
- prioridade;
- trecho encontrado;
- botão para abrir memória.

---

## 10. Comportamento de busca

### 10.1 MVP

Implementar busca textual simples com:

- `ILIKE` para título/conteúdo;
- filtros por campos estruturados.

Exemplo:

```sql
SELECT * FROM memories
WHERE
  ($1::text IS NULL OR title ILIKE '%' || $1 || '%' OR content ILIKE '%' || $1 || '%')
  AND ($2::uuid IS NULL OR project_id = $2)
  AND ($3::text IS NULL OR type = $3)
  AND ($4::text IS NULL OR status = $4)
ORDER BY updated_at DESC
LIMIT 50;
```

### 10.2 Evolução

Adicionar PostgreSQL full-text search.

Depois adicionar `pgvector` com campo `embedding`.

Futuro campo:

```sql
ALTER TABLE memories ADD COLUMN embedding vector(1536);
```

---

## 11. API interna sugerida

Caso use Next.js API routes, criar endpoints:

### Projects

```http
GET /api/projects
POST /api/projects
GET /api/projects/:id
PATCH /api/projects/:id
DELETE /api/projects/:id
```

### Memories

```http
GET /api/memories
POST /api/memories
GET /api/memories/:id
PATCH /api/memories/:id
DELETE /api/memories/:id
```

Parâmetros de `GET /api/memories`:

```ts
{
  q?: string;
  project_id?: string;
  type?: string;
  status?: string;
  priority?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}
```

### Inbox

```http
GET /api/inbox
POST /api/inbox
PATCH /api/inbox/:id
POST /api/inbox/:id/convert
DELETE /api/inbox/:id
```

### Contexto para IA

```http
GET /api/projects/:id/ai-context
```

Esse endpoint deve retornar:

- resumo do projeto;
- memórias críticas vigentes;
- decisões vigentes;
- regras vigentes;
- prompts vigentes relevantes;
- erros/soluções importantes.

Exemplo de retorno:

```json
{
  "project": {
    "name": "Born Sales",
    "slug": "born-sales",
    "ai_summary": "Projeto de automação para extração e conferência de dados de engenharia a partir de DWG/PDF."
  },
  "critical_memories": [
    {
      "type": "decisao",
      "title": "Fonte oficial PDF/DWG",
      "content": "O PDF é a fonte oficial para saber quais pilares existem. O DWG é a fonte oficial para posições geométricas."
    }
  ]
}
```

---

## 12. Futuro: integração com Claude

A aplicação deve ser pensada para futura integração via:

- MCP Server;
- API HTTP local;
- exportação de contexto;
- busca semântica.

Ferramentas futuras:

```text
search_memory(query, project?, type?, status?)
read_memory(id)
get_project_context(project)
create_memory(project, type, title, content)
mark_memory_obsolete(id)
list_critical_memories(project?)
```

O Claude deve consultar memórias com prioridade:

```text
vigente > referência > histórico > obsoleto
crítica > alta > média > baixa
```

Por padrão, não retornar memórias obsoletas para contexto de IA, exceto quando o usuário pedir histórico.

---

## 13. Regras de UX

### 13.1 Interface limpa

A aplicação deve parecer uma ferramenta profissional de gestão de conhecimento, não um banco de dados cru.

Referências visuais:

- Linear;
- Notion database;
- Apple Notes em layout de três colunas;
- Raycast snippets;
- Directus admin, mas mais simples.

### 13.2 Densidade moderada

O usuário precisa conseguir ver muitas memórias, mas sem poluição visual.

Usar:

- badges para tipo/status/prioridade;
- cards compactos;
- filtros fixos;
- busca sempre visível.

### 13.3 Cores sugeridas

Não exagerar nas cores.

- vigente: verde discreto;
- rascunho: amarelo discreto;
- obsoleto: cinza;
- crítica: vermelho discreto;
- alta: laranja discreto;
- média: azul/cinza;
- baixa: cinza.

### 13.4 Markdown

Conteúdo da memória deve ser escrito em Markdown.

MVP pode usar textarea simples.

Depois adicionar preview Markdown.

---

## 14. Fluxos principais

### 14.1 Criar nova memória

1. Usuário clica em `+ Nova memória`.
2. Seleciona projeto.
3. Seleciona tipo.
4. Escreve título e conteúdo.
5. Define status e prioridade.
6. Adiciona tags.
7. Salva.

### 14.2 Registrar aprendizado após desenvolvimento

1. Usuário abre projeto.
2. Clica em `+ Nova memória`.
3. Tipo: `licao_aprendida` ou `solucao`.
4. Registra problema, causa e solução.
5. Marca como vigente.
6. Salva.

Template sugerido para solução:

```md
## Problema

Descreva o erro ou dificuldade.

## Causa

Explique a causa identificada.

## Solução

Descreva a solução aplicada.

## Quando reutilizar

Explique em quais situações futuras essa solução deve ser lembrada.
```

### 14.3 Marcar memória como obsoleta

1. Usuário abre memória.
2. Clica em `Marcar como obsoleta`.
3. Opcionalmente informa motivo.
4. Sistema atualiza status.
5. Sistema mantém histórico.

### 14.4 Preparar contexto para Claude

1. Usuário abre projeto.
2. Clica em `Contexto para IA`.
3. Sistema mostra resumo composto por:
   - ai_summary do projeto;
   - memórias críticas vigentes;
   - decisões vigentes;
   - regras vigentes;
   - prompts ativos;
   - lições aprendidas importantes.
4. Usuário pode copiar esse contexto.

---

## 15. Templates de memória

### 15.1 Decisão

```md
## Decisão

Descreva a decisão tomada.

## Motivo

Explique por que essa decisão foi tomada.

## Impacto

Explique onde isso deve ser aplicado.
```

### 15.2 Erro/Solução

```md
## Erro

Descreva o erro.

## Causa

Descreva a causa raiz.

## Solução

Descreva a solução aplicada.

## Prevenção

Explique como evitar no futuro.
```

### 15.3 Prompt aprovado

```md
## Objetivo do prompt

Explique a função do agente/prompt.

## Regras principais

- Regra 1
- Regra 2
- Regra 3

## Formato de saída

Descreva o output esperado.

## Prompt

Cole o prompt aprovado aqui.
```

### 15.4 Código reutilizável

```md
## Objetivo

Explique para que serve o código.

## Ambiente

Exemplo: n8n Code Node, Node.js, Python, Bash.

## Código

```js
// código aqui
```

## Observações

Explique cuidados e dependências.
```

### 15.5 Lição aprendida

```md
## Lição

Descreva o aprendizado.

## Contexto

Explique em que projeto/situação isso apareceu.

## Aplicação futura

Explique quando lembrar disso novamente.
```

---

## 16. Dados iniciais de exemplo

Criar seed com projetos:

```text
Born Sales
Adharas
SDR Imobiliário
OpenClaw
Infraestrutura Debian
```

Memórias exemplo:

### Born Sales

```text
Tipo: decisão
Título: Fonte oficial PDF/DWG
Status: vigente
Prioridade: alta
Conteúdo: O PDF é a fonte oficial para saber quais pilares existem. O DWG é a fonte oficial para posições geométricas. A conciliação deve usar matching global, preferencialmente algoritmo Húngaro.
```

```text
Tipo: decisão
Título: Precificação inicial
Status: rascunho
Prioridade: alta
Conteúdo: Modelo discutido: setup de R$ 10.000 + mensalidade de R$ 7.000. Posicionar como processo crítico, validação e responsabilidade, não apenas como código gerado com IA.
```

### Adharas

```text
Tipo: regra
Título: Banho apenas em cachorros
Status: vigente
Prioridade: critica
Conteúdo: O agente da Adharas Pet Shop não deve oferecer banho para gatos. Banho é apenas para cachorros. Sempre confirmar espécie antes de sugerir serviço.
```

```text
Tipo: solução
Título: Evitar loop na escolha de horário
Status: vigente
Prioridade: alta
Conteúdo: Persistir last_slots, last_date e source_id em Postgres para que quando o usuário responda apenas "16h", o sistema consiga resolver o horário escolhido sem listar tudo novamente.
```

### SDR Imobiliário

```text
Tipo: prompt
Título: Classificador de intenção inicial
Status: vigente
Prioridade: alta
Conteúdo: Classificar resposta do cliente em COMPRAR, ALUGAR ou CORRETOR. Saída deve ser JSON estrito com error, tipo_output e msg_reply.
```

---

## 17. Critérios de aceite do MVP

O MVP está pronto quando:

- usuário consegue criar projetos;
- usuário consegue criar, editar, listar e excluir memórias;
- usuário consegue filtrar memórias por projeto, tipo, status e prioridade;
- usuário consegue buscar memórias por texto;
- usuário consegue marcar memória como vigente, rascunho, obsoleta ou referência;
- usuário consegue visualizar memórias críticas;
- usuário consegue usar Inbox para capturar texto bruto e converter em memória;
- usuário consegue abrir uma página de projeto e ver contexto, decisões, regras, prompts e erros;
- sistema salva histórico básico de versões ao editar memória;
- sistema tem endpoint ou botão para gerar/copiar contexto para IA por projeto.

---

## 18. Roadmap recomendado

### Fase 1 — MVP humano

- Next.js + PostgreSQL + Prisma;
- CRUD de projetos;
- CRUD de memórias;
- filtros;
- busca textual;
- editor Markdown simples;
- inbox;
- contexto para IA copiável.

### Fase 2 — Memória inteligente

- full-text search PostgreSQL;
- templates por tipo de memória;
- detecção de possíveis duplicidades;
- sugestões de tags;
- preview Markdown;
- histórico de versões mais completo.

### Fase 3 — RAG

- adicionar pgvector;
- gerar embeddings para memórias;
- busca semântica;
- busca híbrida textual + vetorial;
- endpoint `/api/search/semantic`.

### Fase 4 — Integração Claude

- criar MCP server;
- tools: search_memory, get_project_context, read_memory, create_memory;
- permitir Claude consultar memórias diretamente;
- permitir escrita controlada na Inbox.

### Fase 5 — Auditoria de aprendizado

- tela de possíveis contradições;
- tela de memórias obsoletas;
- promoção de soluções para padrões;
- avaliação manual da utilidade das memórias.

---

## 19. Diretrizes para implementação no Cursor

Ao desenvolver, priorizar código simples, limpo e evolutivo.

Não implementar RAG na primeira versão.

Primeiro entregar a base humana:

1. banco;
2. telas;
3. CRUD;
4. filtros;
5. busca textual;
6. contexto para IA.

A busca semântica deve ser preparada, mas não obrigatória no MVP.

Evitar overengineering.

Manter componentes separados:

```text
components/projects
components/memories
components/inbox
components/search
components/layout
lib/db
lib/validators
lib/constants
```

Usar Zod para validar formulários e payloads.

Usar enums centralizados para tipos, status e prioridades.

---

## 20. Resultado esperado

Ao final, o usuário deve ter uma aplicação local/web que funcione como uma central de memória para IA.

Essa central permitirá que o Claude seja alimentado com contexto confiável sobre desenvolvimentos anteriores, padrões, decisões, erros resolvidos, prompts aprovados e lições aprendidas.

A meta não é substituir o raciocínio do Claude, mas fornecer a ele uma base confiável para não começar do zero a cada tarefa.

Frase-guia do projeto:

> RAG é o motor de busca. A memória estruturada é o que transforma histórico em aprendizado reutilizável.

