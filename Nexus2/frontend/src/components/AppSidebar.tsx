import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  BarChart3,
  FolderOpen,
  BookOpen,
  Users,
  Key,
  Activity,
  Cog,
  LogOut,
  LineChart,
  Layers,
  KanbanSquare,
  ShieldOff,
  PlayCircle,
  Ticket,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const allNavItems = [
  { path: '/', label: 'Dashboard', icon: BarChart3 },
  { path: '/files', label: 'Arquivos', icon: FolderOpen },
  { path: '/kanban', label: 'Kanban', icon: KanbanSquare },
  { path: '/knowledge', label: 'Conhecimento', icon: BookOpen },
  { path: '/admin/users', label: 'Usuários', icon: Users, roles: ['admin', 'manager'] },
  { path: '/admin/apis', label: 'APIs', icon: Key, roles: ['admin'] },
  { path: '/admin/audit', label: 'Auditoria', icon: Activity, roles: ['admin', 'manager'] },
  { path: '/admin/automation', label: 'Automação', icon: Cog, roles: ['admin', 'manager'] },
  { path: '/admin/metrics', label: 'Métricas RAG', icon: LineChart, roles: ['admin', 'manager'] },
  { path: '/admin/domains', label: 'Domínios', icon: Layers, roles: ['admin', 'manager'] },
  { path: '/admin/blocklist', label: 'Blocklist WA', icon: ShieldOff, roles: ['admin', 'manager'] },
  { path: '/admin/ingestion', label: 'Ingestão RAG', icon: PlayCircle, roles: ['admin', 'manager'] },
  { path: '/admin/tickets', label: 'Tickets',      icon: Ticket,    roles: ['admin', 'manager'] },
  { path: '/admin/sla',     label: 'SLA / Relatórios', icon: BarChart2, roles: ['admin', 'manager'] },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = allNavItems.filter((item) =>
    item.roles ? item.roles.includes(user?.role?.name || '') : true
  );

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-[240px] h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {filteredNav.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-inner text-sm transition-colors',
              isActive(item.path)
                ? 'bg-sidebar-accent text-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role?.name}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-inner text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
