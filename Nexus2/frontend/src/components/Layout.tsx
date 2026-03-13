import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/files', label: 'Arquivos', icon: '📁' },
  { path: '/knowledge', label: 'Conhecimento', icon: '📚' },
  { path: '/admin/users', label: 'Usuários', icon: '👥', roles: ['admin', 'manager'] },
  { path: '/admin/audit', label: 'Auditoria', icon: '🔍', roles: ['admin', 'manager'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) =>
    item.roles ? item.roles.includes(user?.role?.name || '') : true
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-secondary text-white fixed h-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-lumen-turquoise">Nexus</h1>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
          <p className="text-sm text-gray-300 mt-1">Knowledge Base</p>
        </div>

        <nav className="mt-8">
          {filteredNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-gray-700">
          <div className="text-sm mb-4">
            <p className="font-medium">{user?.name}</p>
            <p className="text-gray-400 text-xs">{user?.role?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
