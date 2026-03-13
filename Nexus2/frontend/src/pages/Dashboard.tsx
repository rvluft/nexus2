import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Stats {
  totalFiles: number;
  totalKnowledge: number;
  ingestionJobs: number;
  activeUsers: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalFiles: 0,
    totalKnowledge: 0,
    ingestionJobs: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [filesRes, knowledgeRes, usersRes] = await Promise.all([
        api.get('/files'),
        api.get('/knowledge'),
        api.get('/users/count'),
      ]);

      setStats({
        totalFiles: filesRes.data.total || 0,
        totalKnowledge: knowledgeRes.data.total || 0,
        ingestionJobs: 0, // TODO: buscar contagem de jobs ativos
        activeUsers: usersRes.data.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-secondary mb-6">Dashboard</h1>

      {loading ? (
        <div className="text-center py-10">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500">Arquivos</h3>
            <p className="text-3xl font-bold text-primary mt-2">{stats.totalFiles}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500">Base de Conhecimento</h3>
            <p className="text-3xl font-bold text-primary mt-2">{stats.totalKnowledge}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500">Processamentos</h3>
            <p className="text-3xl font-bold text-primary mt-2">{stats.ingestionJobs}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500">Usuários Ativos</h3>
            <p className="text-3xl font-bold text-primary mt-2">{stats.activeUsers}</p>
          </div>
        </div>
      )}

      <div className="mt-8 card">
        <h2 className="text-lg font-semibold mb-4">Bem-vindo ao Nexus</h2>
        <p className="text-gray-600">
          Sistema de gestão de base de conhecimento com integração n8n.
          Utilize o menu ao lado para navegar.
        </p>
      </div>
    </div>
  );
}
