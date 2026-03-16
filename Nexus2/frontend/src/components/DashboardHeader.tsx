import { Search, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function DashboardHeader() {
  const { user } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-secondary rounded-inner px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar arquivos, coleções, logs..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-64"
          />
          <kbd className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded-sm font-mono-data">
            ⌘F
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground font-mono-data">
          Env: Production
        </span>
        <div className="h-4 w-px bg-border" />
        <button className="p-2 hover:bg-secondary rounded-inner transition-colors relative">
          <Bell className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>
        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
          {getInitials(user?.name)}
        </div>
      </div>
    </header>
  );
}
