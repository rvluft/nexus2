import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Files from './pages/Files';
import Knowledge from './pages/Knowledge';
import AdminUsers from './pages/Admin/Users';
import AdminApis from './pages/Admin/Apis';
import AuditLogs from './pages/Admin/AuditLogs';
import AdminAutomation from './pages/Admin/Automation';
import AdminMetrics from './pages/Admin/Metrics';
import AdminDomains from './pages/Admin/Domains';
import AdminBlocklist from './pages/Admin/Blocklist';
import AdminIngestion from './pages/Admin/Ingestion';
import AdminTickets from './pages/Admin/Tickets';
import AdminSla from './pages/Admin/Sla';
import Kanban from './pages/Kanban';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="files" element={<Files />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/apis" element={<AdminApis />} />
        <Route path="admin/audit" element={<AuditLogs />} />
        <Route path="admin/automation" element={<AdminAutomation />} />
        <Route path="admin/metrics" element={<AdminMetrics />} />
        <Route path="admin/domains" element={<AdminDomains />} />
        <Route path="admin/blocklist" element={<AdminBlocklist />} />
        <Route path="admin/ingestion" element={<AdminIngestion />} />
        <Route path="admin/tickets" element={<AdminTickets />} />
        <Route path="admin/sla" element={<AdminSla />} />
        <Route path="kanban" element={<Kanban />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
