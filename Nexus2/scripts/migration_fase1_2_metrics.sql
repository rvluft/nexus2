-- ============================================================
-- Fase 1 & 2 — Métricas RAG
-- ============================================================

-- Avaliações RAGAS
CREATE TABLE IF NOT EXISTS nexus.rag_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  context_precision FLOAT,
  context_recall FLOAT,
  faithfulness FLOAT,
  answer_relevancy FLOAT,
  context_relevancy FLOAT,
  avg_score FLOAT GENERATED ALWAYS AS (
    (COALESCE(context_precision, 0) + COALESCE(context_recall, 0) +
     COALESCE(faithfulness, 0) + COALESCE(answer_relevancy, 0) +
     COALESCE(context_relevancy, 0)) /
    NULLIF(
      (CASE WHEN context_precision IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN context_recall IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN faithfulness IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN answer_relevancy IS NOT NULL THEN 1 ELSE 0 END +
       CASE WHEN context_relevancy IS NOT NULL THEN 1 ELSE 0 END),
    0)
  ) STORED,
  sample_size INT,
  notes TEXT,
  source VARCHAR(50) DEFAULT 'manual', -- 'manual' | 'n8n' | 'ci'
  created_by UUID REFERENCES nexus.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alertas de métricas (Fase 2)
CREATE TABLE IF NOT EXISTS nexus.metric_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_run_id UUID REFERENCES nexus.rag_metrics(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  threshold FLOAT NOT NULL,
  current_value FLOAT NOT NULL,
  message TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES nexus.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rag_metrics_evaluated_at ON nexus.rag_metrics(evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_alerts_resolved ON nexus.metric_alerts(resolved_at) WHERE resolved_at IS NULL;
