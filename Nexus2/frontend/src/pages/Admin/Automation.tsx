import { useState } from 'react';
import { triggerAdminN8nFlow } from '../../lib/api';
import { motion } from 'framer-motion';
import { Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminAutomation() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrigger = async () => {
    if (!confirm('Disparar fluxo n8n de administração?')) return;

    setLoading(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await triggerAdminN8nFlow();
      setLastResult(
        result.executionId
          ? `Fluxo disparado. Execução: ${result.executionId}`
          : result.message || 'Fluxo disparado com sucesso.',
      );
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Não foi possível contatar o n8n. Tente novamente mais tarde.';
      setError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-medium text-foreground mb-6">Automação (n8n)</h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card space-y-4 max-w-2xl"
      >
        <p className="text-sm text-muted-foreground">
          Aqui você pode disparar manualmente o fluxo de administração configurado no n8n.
          Apenas usuários com papel <strong className="text-foreground">admin</strong> ou{' '}
          <strong className="text-foreground">manager</strong> têm acesso a esta ação.
        </p>

        <button
          onClick={handleTrigger}
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Zap className="h-4 w-4" strokeWidth={1.5} />
          {loading ? 'Disparando...' : 'Disparar fluxo n8n'}
        </button>

        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 rounded-inner border text-sm"
            style={{
              background: 'hsl(150 50% 45% / 0.1)',
              borderColor: 'hsl(150 50% 45% / 0.3)',
              color: 'hsl(150 50% 55%)',
            }}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
            {lastResult}
          </motion.div>
        )}

        {error && !lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 rounded-inner border text-sm"
            style={{
              background: 'hsl(0 62% 50% / 0.1)',
              borderColor: 'hsl(0 62% 50% / 0.3)',
              color: 'hsl(0 62% 65%)',
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
