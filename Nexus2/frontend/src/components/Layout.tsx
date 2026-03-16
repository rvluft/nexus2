import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import DashboardHeader from './DashboardHeader';

export default function Layout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div
        className="flex-1 flex flex-col min-w-0 relative"
        style={{
          background:
            'linear-gradient(135deg, hsl(220 40% 6%) 0%, hsl(240 30% 10%) 25%, hsl(260 35% 12%) 50%, hsl(230 40% 8%) 75%, hsl(210 35% 6%) 100%)',
        }}
      >
        {/* Subtle glow effects */}
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none"
          style={{ background: 'hsl(217 70% 40%)' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none"
          style={{ background: 'hsl(270 60% 45%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[150px] pointer-events-none"
          style={{ background: 'hsl(200 50% 35%)' }}
        />

        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6 relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
