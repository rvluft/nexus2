import { useEffect, useState } from 'react';
import { api, RagMetric, MetricAlert } from '../../lib/api';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  BellOff,
  RefreshCw,
} from 'lucide-react';

// ── Thresholds (espelham o backend) ─────────────────────────
const THRESHOLDS: Record<string, number> = {
  context_precision: 0.85,
  context_recall: 0.75,
  faithfulness: 0.90,
  answer_relevancy: 0.85,
  context_relevancy: 0.90,
};

const METRIC_LABELS: Record<string, string> = {
  context_precision: 'Context Precision',
  context_recall: 'Context Recall',
  faithfulness: 'Faithfulness',
  answer_relevancy: 'Answer Relevancy',
  context_relevancy: 'Context Relevancy',
};

// ── Helpers ──────────────────────────────────────────────────
function scoreColor(value: number | null, key: string) {
  if (value === null) return 'hsl(220 15% 45%)';
  const thr = THRESHOLDS[key] ?? 0.85;
  if (value >= thr) return 'hsl(150 50% 45%)';
  if (value >= thr - 0.1) return 'hsl(38 92% 55%)';
  return 'hsl(0 62% 55%)';
}

function scoreBg(value: number | null, key: string) {
  if (value === null) return 'hsl(220 15% 45% / 0.1)';
  const thr = THRESHOLDS[key] ?? 0.85;
  if (value >= thr) return 'hsl(150 50% 45% / 0.1)';
  if (value >= thr - 0.1) return 'hsl(38 92% 55% / 0.1)';
  return 'hsl(0 62% 55% / 0.1)';
}

function fmt(v: number | null) {
  if (v === null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('pt-BR');
}

// ── Score Card ───────────────────────────────────────────────
function ScoreCard({
  label,
  metricKey,
  value,
}: {
  label: string;
  metricKey: string;
  value: number | null;
}) {
  const thr = THRESHOLDS[metricKey];
  const barPct = value !== null ? Math.round(value * 100) : 0;

  return (
    <div
      className="rounded-outer p-4 border border-border/40 flex flex-col gap-3"
      style={{ background: scoreBg(value, metricKey) }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {value !== null ? (
          value >= thr ? (
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: scoreColor(value, metricKey) }} strokeWidth={1.5} />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: scoreColor(value, metricKey) }} strokeWidth={1.5} />
          )
        ) : (
          <XCircle className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        )}
      </div>
      <div className="text-2xl font-semibold" style={{ color: scoreColor(value, metricKey) }}>
        {fmt(value)}
      </div>
      {/* barra de progresso */}
      <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barPct}%`,
            background: scoreColor(value, metricKey),
          }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Threshold: {(thr * 100).toFixed(0)}%
      </div>
    </div>
  );
}

// ── Mini sparkline (últimas 10 avaliações) ───────────────────
function Sparkline({ history, metricKey }: { history: RagMetric[]; metricKey: string }) {
  const values = history
    .slice(0, 10)
    .reverse()
    .map((m) => (m as Record<string, any>)[metricKey] as number | null);

  const h = 36;
  const w = 100;
  const step = values.length > 1 ? w / (values.length - 1) : w;

  const points = values
    .map((v, i) => {
      if (v === null) return null;
      const x = i * step;
      const y = h - v * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean);

  if (points.length < 2) return null;

  const thr = THRESHOLDS[metricKey] ?? 0.85;
  const thrY = h - thr * h;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {/* linha de threshold */}
      <line
        x1={0} y1={thrY} x2={w} y2={thrY}
        stroke="hsl(220 15% 35%)"
        strokeWidth={0.5}
        strokeDasharray="2 2"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={scoreColor(values[values.length - 1], metricKey)}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* ponto final */}
      {points.length > 0 && (() => {
        const last = points[points.length - 1]!.split(',');
        return (
          <circle
            cx={last[0]}
            cy={last[1]}
            r={2}
            fill={scoreColor(values[values.length - 1], metricKey)}
          />
        );
      })()}
    </svg>
  );
}

// ── Modal de nova avaliação ──────────────────────────────────
type FormData = {
  context_precision: string;
  context_recall: string;
  faithfulness: string;
  answer_relevancy: string;
  context_relevancy: string;
  sample_size: string;
  notes: string;
};

function NewMetricModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>({
    context_precision: '',
    context_recall: '',
    faithfulness: '',
    answer_relevancy: '',
    context_relevancy: '',
    sample_size: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v === '') continue;
        payload[k] = k === 'notes' ? v : Number(v);
      }
      await api.post('/metrics', payload);
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const fields: [keyof FormData, string, string][] = [
    ['context_precision', 'Context Precision', '0 – 1  (threshold ≥0.85)'],
    ['context_recall', 'Context Recall', '0 – 1  (threshold ≥0.75)'],
    ['faithfulness', 'Faithfulness', '0 – 1  (threshold ≥0.90)'],
    ['answer_relevancy', 'Answer Relevancy', '0 – 1  (threshold ≥0.85)'],
    ['context_relevancy', 'Context Relevancy', '0 – 1  (threshold ≥0.90)'],
    ['sample_size', 'Nº de amostras', 'Quantidade de pares Q&A avaliados'],
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-lg"
        style={{ background: 'linear-gradient(145deg, hsl(240 10% 6%) 0%, hsl(230 15% 9%) 100%)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-foreground">Nova Avaliação RAG</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(([key, label, hint]) => (
              <div key={key} className={key === 'sample_size' ? 'col-span-1' : ''}>
                <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
                <input
                  type="number"
                  step={key === 'sample_size' ? '1' : '0.001'}
                  min={0}
                  max={key === 'sample_size' ? undefined : 1}
                  value={form[key]}
                  onChange={set(key)}
                  className="input text-sm"
                  placeholder={hint}
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              className="input text-sm resize-none"
              rows={2}
              placeholder="Contexto da avaliação, mudanças feitas, etc."
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function AdminMetrics() {
  const [latest, setLatest] = useState<RagMetric | null>(null);
  const [history, setHistory] = useState<RagMetric[]>([]);
  const [alerts, setAlerts] = useState<MetricAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [latestRes, historyRes, alertsRes] = await Promise.all([
        api.get('/metrics/latest'),
        api.get('/metrics?limit=10'),
        api.get('/metrics/alerts'),
      ]);
      setLatest(latestRes.data);
      setHistory(historyRes.data.data || []);
      setAlerts(alertsRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      await api.patch(`/metrics/alerts/${alertId}/resolve`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao resolver alerta');
    } finally {
      setResolvingId(null);
    }
  };

  const metricKeys = Object.keys(THRESHOLDS) as (keyof typeof THRESHOLDS)[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground">Métricas RAG</h1>
          {latest && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Última avaliação: {fmtDate(latest.evaluated_at)}
              {latest.sample_size ? ` · ${latest.sample_size} amostras` : ''}
              {latest.source !== 'manual' && ` · via ${latest.source}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); load(); }}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            Atualizar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Nova Avaliação
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-16">Carregando...</div>
      ) : (
        <>
          {/* Score cards — última avaliação */}
          {latest ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
            >
              {metricKeys.map((key) => (
                <ScoreCard
                  key={key}
                  label={METRIC_LABELS[key]}
                  metricKey={key}
                  value={(latest as Record<string, any>)[key] as number | null}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-outer border border-border/40 p-10 text-center text-muted-foreground"
            >
              Nenhuma avaliação registrada ainda.
              <br />
              Clique em <strong className="text-foreground">Nova Avaliação</strong> para inserir manualmente
              ou configure o webhook no n8n.
            </motion.div>
          )}

          {/* Score médio */}
          {latest?.avg_score !== null && latest?.avg_score !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="rounded-outer border border-border/40 p-4 flex items-center gap-4"
              style={{ background: scoreBg(latest.avg_score, 'answer_relevancy') }}
            >
              <div>
                <p className="text-xs text-muted-foreground">Score Médio Geral</p>
                <p
                  className="text-3xl font-bold mt-0.5"
                  style={{ color: scoreColor(latest.avg_score, 'answer_relevancy') }}
                >
                  {fmt(latest.avg_score)}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {latest.avg_score >= 0.85 ? (
                  <span className="flex items-center gap-1.5" style={{ color: 'hsl(150 50% 45%)' }}>
                    <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                    RAG pronto para produção (≥ 85%)
                  </span>
                ) : latest.avg_score >= 0.7 ? (
                  <span className="flex items-center gap-1.5" style={{ color: 'hsl(38 92% 55%)' }}>
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                    Necessita ajustes (70–84%)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5" style={{ color: 'hsl(0 62% 55%)' }}>
                    <XCircle className="h-4 w-4" strokeWidth={1.5} />
                    Refatore o retrieval primeiro ({'<'} 70%)
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* Alertas abertos */}
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="card p-0 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: 'hsl(38 92% 55%)' }} strokeWidth={1.5} />
                <span className="text-sm font-medium text-foreground">
                  {alerts.length} alerta{alerts.length > 1 ? 's' : ''} em aberto
                </span>
              </div>
              <div className="divide-y divide-border/30">
                {alerts.map((alert) => (
                  <div key={alert.id} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(alert.created_at)}</p>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      title="Marcar como resolvido"
                    >
                      <BellOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Resolver
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Histórico com sparklines */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <h2 className="text-sm font-medium text-foreground mb-3">Tendência (últimas 10 avaliações)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {metricKeys.map((key) => (
                  <div key={key} className="card p-3">
                    <p className="text-xs text-muted-foreground mb-2">{METRIC_LABELS[key]}</p>
                    <Sparkline history={history} metricKey={key} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tabela de histórico */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="card overflow-hidden p-0"
            >
              <div className="px-4 py-3 border-b border-border/60">
                <span className="text-sm font-medium text-foreground">Histórico de Avaliações</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="table-th">Data</th>
                      <th className="table-th">C.Precision</th>
                      <th className="table-th">C.Recall</th>
                      <th className="table-th">Faithfulness</th>
                      <th className="table-th">A.Relevancy</th>
                      <th className="table-th">C.Relevancy</th>
                      <th className="table-th">Média</th>
                      <th className="table-th">Amostras</th>
                      <th className="table-th">Fonte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {history.map((row) => (
                      <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="table-td text-xs text-muted-foreground whitespace-nowrap font-mono">
                          {fmtDate(row.evaluated_at)}
                        </td>
                        {metricKeys.map((key) => (
                          <td key={key} className="table-td text-xs font-medium"
                            style={{ color: scoreColor((row as any)[key], key) }}>
                            {fmt((row as any)[key])}
                          </td>
                        ))}
                        <td className="table-td text-xs font-semibold"
                          style={{ color: scoreColor(row.avg_score, 'answer_relevancy') }}>
                          {fmt(row.avg_score)}
                        </td>
                        <td className="table-td text-xs text-muted-foreground">
                          {row.sample_size ?? '—'}
                        </td>
                        <td className="table-td">
                          <span className="text-xs px-2 py-0.5 rounded-inner"
                            style={{
                              background: 'hsl(217 70% 55% / 0.1)',
                              color: 'hsl(217 70% 65%)',
                            }}>
                            {row.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Info: webhook URL */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="rounded-outer border border-border/40 p-4"
            style={{ background: 'hsl(220 25% 7%)' }}
          >
            <p className="text-xs font-medium text-foreground mb-1">Integração n8n (Webhook)</p>
            <p className="text-xs text-muted-foreground mb-2">
              Configure seu workflow de avaliação RAGAS para enviar os resultados automaticamente:
            </p>
            <code className="text-xs font-mono text-primary block">
              POST /api/metrics/webhook
            </code>
            <code className="text-xs font-mono text-muted-foreground block mt-1">
              Authorization: Bearer {'<METRICS_WEBHOOK_TOKEN>'}
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Campos: <code className="text-primary">context_precision</code>,{' '}
              <code className="text-primary">context_recall</code>,{' '}
              <code className="text-primary">faithfulness</code>,{' '}
              <code className="text-primary">answer_relevancy</code>,{' '}
              <code className="text-primary">context_relevancy</code>,{' '}
              <code className="text-primary">sample_size</code>,{' '}
              <code className="text-primary">notes</code>
              {' '}(todos opcionais, valores entre 0 e 1)
            </p>
          </motion.div>
        </>
      )}

      {showModal && (
        <NewMetricModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            setLoading(true);
            load();
          }}
        />
      )}
    </div>
  );
}
