import { useEffect, useState } from 'react';
import { api, AuditLog } from '../../lib/api';

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
      <h1 className="text-2xl font-bold text-secondary mb-6">Logs de Auditoria</h1>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum log encontrado.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="table-th">Data/Hora</th>
                <th className="table-th">Usuário</th>
                <th className="table-th">Ação</th>
                <th className="table-th">Recurso</th>
                <th className="table-th">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="table-td text-sm">{formatDate(log.created_at)}</td>
                  <td className="table-td">
                    {log.user ? (
                      <div>
                        <p className="font-medium">{log.user.name}</p>
                        <p className="text-xs text-gray-500">{log.user.email}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">Sistema</span>
                    )}
                  </td>
                  <td className="table-td font-mono text-xs">{log.action}</td>
                  <td className="table-td">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {log.resource_type}
                    </span>
                  </td>
                  <td className="table-td text-sm">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
