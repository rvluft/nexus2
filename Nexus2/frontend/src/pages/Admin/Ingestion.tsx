import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle, RefreshCw, CheckCircle2, XCircle,
  Clock, Loader2, AlertCircle, FileText, Zap,
} from 'lucide-react';

interface IngestionJob {
  id: string;
  file_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  n8n_execution_id?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  file: { id: string; original_name: string; filename: string };
}

interface Stats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  eligible: number;
}

const STATUS_CONFIG = {
  pending:    { color: 'hsl(217 70% 65%)', label: 'Pendente',    Icon: Clock },
  processing: { color: 'hsl(38 92% 65%)',  label: 'Processando', Icon: Loader2 },
  completed:  { color: 'hsl(150 50% 55%)', label: 'Concluído',   Icon: CheckCircle2 },
  failed:     { color: 'hsl(0 62% 65%)',   label: 'Falhou',      Icon: XCircle },
} as const;

const fmt = {
  date: (d?: string) =>
    d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—',
  duration: (start?: string, end?: string) => {
    if (!start) return '';
    const ms = new Date(end || Date.now()).getTime() - new Date(start).getTime();
    if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  },
};

export default function AdminIngestion() {
  const [stats, setStats] = useState<Stats>({ pending: 0, processing: 0, completed: 0, failed: 0, eligible: 0 });
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const [statsRes, jobsRes] = await Promise.all([
        api.get('/n8n/ingestion-stats'),
        api.get('/n8n/ingestion-jobs', { params: { status: statusFilter || undefined, limit: 100 } }),
      ]);
      setStats(statsRes.data);
      setJobs(jobsRes.data.data);
    } catch (err) {
      console.error('Erro ao carregar jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh a cada 15s se houver jobs ativos
  useEffect(() => {
    const active = stats.pending + stats.processing;
    if (active === 0) return;
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [stats.pending, stats.processing, load]);

  const handleTriggerAll = async () => {
    if (stats.eligible === 0) return;
    if (!confirm(`Disparar ingestão para ${stats.eligible} arquivo(s) elegível(is)?`)) return;
    setTriggering(true);
    try {
      const res = await api.post('/n8n/trigger-ingestion', {});
      alert(`${res.data.triggered} arquivo(s) enviado(s) para ingestão.`);
      setLoading(true);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao disparar ingestão');
    } finally {
      setTriggering(false);
    }
  };

  const handleRetry = async (fileId: string, fileName: string) => {
    if (!confirm(`Reenviar "${fileName}" para ingestão?`)) return;
    try {
      await api.post('/n8n/trigger-ingestion', { file_ids: [fileId] });
      setLoading(true);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao reprocessar');
    }
  };

  const statCards = [
    { key: 'eligible', label: 'Aguardando ingestão', color: 'hsl(280 60% 65%)', Icon: Zap },
    { key: 'processing', label: 'Processando', color: STATUS_CONFIG.processing.color, Icon: Loader2 },
    { key: 'completed', label: 'Concluídos', color: STATUS_CONFIG.completed.color, Icon: CheckCircle2 },
    { key: 'failed', label: 'Falhos', color: STATUS_CONFIG.failed.color, Icon: XCircle },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-medium text-foreground">Ingestão RAG</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dispare e monitore a ingestão de arquivos via n8n
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); load(); }}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            Atualizar
          </button>
          <button
            onClick={handleTriggerAll}
            disabled={triggering || stats.eligible === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <PlayCircle className={`h-4 w-4 ${triggering ? 'animate-pulse' : ''}`} strokeWidth={1.5} />
            {triggering ? 'Disparando...' : `Disparar todos (${stats.eligible})`}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ key, label, color, Icon }) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-outer border border-border/40 p-4 flex items-center gap-3"
            style={{ background: `${color}0d` }}
          >
            <div className="p-2 rounded-inner" style={{ background: `${color}20` }}>
              <Icon
                className="h-4 w-4"
                style={{ color }}
                strokeWidth={1.5}
              />
            </div>
            <div>
              <div className="text-2xl font-semibold text-foreground">{stats[key]}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Info webhook */}
      <div className="rounded-outer border border-border/40 p-4 bg-secondary/20 space-y-2">
        <p className="text-xs font-medium text-foreground">Configuração n8n</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Webhook de trigger</span>
            <br />
            Configure <code className="text-primary text-[11px]">N8N_INGESTION_WEBHOOK_URL</code> no <code className="text-[11px]">.env</code> com a URL do webhook n8n que recebe os arquivos para ingestão.
          </div>
          <div>
            <span className="font-medium text-foreground">Callback de status</span>
            <br />
            No workflow n8n, ao concluir, chame{' '}
            <code className="text-primary text-[11px]">POST /api/n8n/ingestion-callback</code>{' '}
            com <code className="text-[11px]">{'{ jobId, fileId, status: "completed"|"failed", error? }'}</code>.
            Header: <code className="text-yellow-400 text-[11px]">Authorization: Bearer {'{{$env.N8N_INGESTION_CALLBACK_TOKEN}}'}</code>
          </div>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-2 flex-wrap">
        {['', 'pending', 'processing', 'completed', 'failed'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-inner text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary/20 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {s === '' ? 'Todos' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Tabela de jobs */}
      {loading ? (
        <div className="text-center text-muted-foreground py-16">Carregando...</div>
      ) : jobs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-outer border border-border/40 p-12 text-center text-muted-foreground"
        >
          <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-30" strokeWidth={1} />
          Nenhum job encontrado.
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-outer border border-border/40 overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Arquivo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Iniciado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Duração</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden xl:table-cell">Execution ID</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {jobs.map((job, i) => {
                  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
                  const { Icon } = cfg;
                  return (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.015 }}
                      className="border-b border-border/20 hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <span className="text-xs text-foreground truncate max-w-[200px]">
                            {job.file?.original_name || job.file_id}
                          </span>
                        </div>
                        {job.error_message && (
                          <div className="text-[10px] text-destructive mt-0.5 ml-5 truncate max-w-[240px]" title={job.error_message}>
                            {job.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-inner font-medium w-fit"
                          style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                        >
                          <Icon
                            className={`h-3 w-3 ${job.status === 'processing' ? 'animate-spin' : ''}`}
                            strokeWidth={1.5}
                          />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {fmt.date(job.started_at || job.created_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell font-mono">
                        {fmt.duration(job.started_at, job.completed_at)}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {job.n8n_execution_id ? (
                          <span className="text-[10px] font-mono text-muted-foreground opacity-60">{job.n8n_execution_id}</span>
                        ) : (
                          <span className="opacity-30 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(job.file_id, job.file?.original_name)}
                            className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-primary"
                            title="Retentar ingestão"
                          >
                            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
