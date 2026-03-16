import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { motion } from 'framer-motion';
import { FolderOpen, BookOpen, Cpu, Users } from 'lucide-react';

interface Stats {
  totalFiles: number;
  totalKnowledge: number;
  ingestionJobs: number;
  activeUsers: number;
}

const cardMotion = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
});

const statCards = [
  {
    key: 'files',
    label: 'Arquivos',
    icon: FolderOpen,
    bgGrad: 'linear-gradient(145deg, hsl(210 30% 8%) 0%, hsl(200 50% 14%) 50%, hsl(190 40% 8%) 100%)',
    glow: 'hsl(200 60% 40%)',
    getValue: (s: Stats) => s.totalFiles,
  },
  {
    key: 'knowledge',
    label: 'Base de Conhecimento',
    icon: BookOpen,
    bgGrad: 'linear-gradient(145deg, hsl(260 20% 8%) 0%, hsl(270 35% 15%) 50%, hsl(280 30% 9%) 100%)',
    glow: 'hsl(270 55% 50%)',
    getValue: (s: Stats) => s.totalKnowledge,
  },
  {
    key: 'ingestion',
    label: 'Processamentos',
    icon: Cpu,
    bgGrad: 'linear-gradient(145deg, hsl(240 15% 7%) 0%, hsl(150 30% 10%) 50%, hsl(160 25% 7%) 100%)',
    glow: 'hsl(150 50% 40%)',
    getValue: (s: Stats) => s.ingestionJobs,
  },
  {
    key: 'users',
    label: 'Usuários Ativos',
    icon: Users,
    bgGrad: 'linear-gradient(145deg, hsl(230 20% 8%) 0%, hsl(215 35% 13%) 40%, hsl(220 30% 7%) 100%)',
    glow: 'hsl(217 60% 40%)',
    getValue: (s: Stats) => s.activeUsers,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
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
        ingestionJobs: 0,
        activeUsers: usersRes.data.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground mb-1">{getGreeting()},</p>
        <h1 className="text-2xl font-light text-foreground tracking-tight">
          {user?.name || 'Usuário'}
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              {...cardMotion(i * 0.05)}
              className="rounded-outer p-5 border border-border/60 hover:border-border transition-colors relative overflow-hidden"
              style={{ background: card.bgGrad }}
            >
              {/* Glow */}
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30 blur-3xl"
                style={{ background: card.glow }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <card.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-data-label">{card.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-data-xl text-foreground font-mono-data">
                    {card.getValue(stats)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div
        {...cardMotion(0.25)}
        className="mt-6 rounded-outer p-6 border border-border/60 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(145deg, hsl(220 25% 8%) 0%, hsl(217 40% 14%) 40%, hsl(225 30% 8%) 100%)',
        }}
      >
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
          style={{ background: 'hsl(217 60% 50%)' }}
        />
        <div className="relative z-10">
          <h2 className="text-sm font-medium text-foreground mb-2">
            Bem-vindo ao sistema
          </h2>
          <p className="text-sm text-muted-foreground">
            Sistema de gestão de base de conhecimento com integração n8n.
            Utilize o menu ao lado para navegar.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
