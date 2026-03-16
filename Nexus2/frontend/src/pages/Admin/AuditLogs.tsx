import { useEffect, useState } from 'react';
import { api, AuditLog } from '../../lib/api';
import { motion } from 'framer-motion';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await api.get('/audit');
      setLogs(response.data.data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  return (
    <div>
      <h1 className="text-xl font-medium text-foreground mb-6">Logs de Auditoria</h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card overflow-hidden p-0"
      >
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum log encontrado.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr className="border-b border-border/60">
                <th className="table-th">Data/Hora</th>
                <th className="table-th">Usuário</th>
                <th className="table-th">Ação</th>
                <th className="table-th">Recurso</th>
                <th className="table-th">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="table-td text-muted-foreground font-mono-data text-xs">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="table-td">
                    {log.user ? (
                      <div>
                        <p className="font-medium text-foreground">{log.user.name}</p>
                        <p className="text-xs text-muted-foreground">{log.user.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sistema</span>
                    )}
                  </td>
                  <td className="table-td font-mono-data text-xs text-muted-foreground">
                    {log.action}
                  </td>
                  <td className="table-td">
                    <span
                      className="px-2 py-1 rounded-inner text-xs font-medium"
                      style={{
                        background: 'hsl(270 55% 50% / 0.15)',
                        color: 'hsl(270 55% 65%)',
                      }}
                    >
                      {log.resource_type}
                    </span>
                  </td>
                  <td className="table-td font-mono-data text-xs text-muted-foreground">
                    {log.ip_address || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
