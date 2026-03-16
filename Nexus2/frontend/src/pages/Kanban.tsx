import { useEffect, useRef, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { api, Domain, File as FileType, DomainAssignment, listFiles } from '../lib/api';
import {
  RotateCcw, Trash2, RefreshCw, FileText,
  Clock, CheckCircle2, AlertCircle, Loader2,
  KanbanSquare, Layers, X, MessageCircle,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────

type ViewMode = 'status' | 'domain';
type Status = 'uploaded' | 'processing' | 'processed' | 'error';

const NO_DOMAIN_ID = '__none__';

// ── Colunas de status ─────────────────────────────────────────

interface StatusColumn { id: Status; label: string; color: string; accent: string; icon: React.ReactNode; }

const STATUS_COLUMNS: StatusColumn[] = [
  { id: 'uploaded',   label: 'Aguardando',  color: 'hsl(217 70% 55%)', accent: 'hsl(217 70% 55% / 0.12)', icon: <Clock        className="h-4 w-4" strokeWidth={1.5} /> },
  { id: 'processing', label: 'Processando', color: 'hsl(38 92% 55%)',  accent: 'hsl(38 92% 55% / 0.10)',  icon: <Loader2      className="h-4 w-4 animate-spin" strokeWidth={1.5} /> },
  { id: 'processed',  label: 'Processado',  color: 'hsl(150 50% 45%)', accent: 'hsl(150 50% 45% / 0.10)', icon: <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} /> },
  { id: 'error',      label: 'Erro',        color: 'hsl(0 62% 55%)',   accent: 'hsl(0 62% 55% / 0.10)',   icon: <AlertCircle  className="h-4 w-4" strokeWidth={1.5} /> },
];

const STATUS_LABELS: Record<string, { color: string; label: string }> = {
  uploaded:   { color: 'hsl(217 70% 65%)', label: 'Aguardando' },
  processing: { color: 'hsl(38 92% 65%)',  label: 'Processando' },
  processed:  { color: 'hsl(150 50% 55%)', label: 'Processado' },
  error:      { color: 'hsl(0 62% 65%)',   label: 'Erro' },
};

const fmt = {
  size: (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`,
  date: (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
};

// ── Card de status (Fase 4) ───────────────────────────────────

function StatusFileCard({
  file, domains, colColor, onReprocess, onDelete, dragging,
}: {
  file: FileType; domains: DomainAssignment[]; colColor: string;
  onReprocess: (id: string) => void; onDelete: (id: string) => void; dragging?: boolean;
}) {
  return (
    <div
      className={`rounded-inner border bg-card p-3 flex flex-col gap-2 select-none transition-shadow ${dragging ? 'shadow-xl opacity-90 rotate-1' : 'shadow-sm hover:shadow-md'}`}
      style={{ borderColor: dragging ? colColor : 'hsl(var(--border) / 0.5)', cursor: dragging ? 'grabbing' : 'grab' }}
    >
      <div className="flex items-start gap-2">
        <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs font-medium text-foreground leading-snug break-all">{file.original_name}</span>
      </div>
      {domains.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {domains.map(d => (
            <span key={d.domain_id} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: `${d.domain_color}20`, color: d.domain_color, border: `1px solid ${d.domain_color}40` }}>
              {d.domain_name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono">{fmt.size(file.size_bytes)} · {fmt.date(file.created_at)}</span>
        <div className="flex items-center gap-0.5">
          {file.status === 'error' && (
            <button onPointerDown={e => e.stopPropagation()} onClick={() => onReprocess(file.id)}
              className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-warning" title="Reprocessar">
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
          <button onPointerDown={e => e.stopPropagation()} onClick={() => onDelete(file.id)}
            className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Excluir">
            <Trash2 className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card de domínio (Fase 5) ──────────────────────────────────

function DomainFileCard({
  file, allDomains, colColor, onRemoveDomain, onDelete, dragging,
}: {
  file: FileType; allDomains: DomainAssignment[]; colColor: string;
  onRemoveDomain: (fileId: string, domainId: string) => void;
  onDelete: (id: string) => void; dragging?: boolean;
}) {
  const st = STATUS_LABELS[file.status] || STATUS_LABELS['uploaded'];
  return (
    <div
      className={`rounded-inner border bg-card p-3 flex flex-col gap-2 select-none transition-shadow ${dragging ? 'shadow-xl opacity-90 rotate-1' : 'shadow-sm hover:shadow-md'}`}
      style={{ borderColor: dragging ? colColor : 'hsl(var(--border) / 0.5)', cursor: dragging ? 'grabbing' : 'grab' }}
    >
      <div className="flex items-start gap-2">
        <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs font-medium text-foreground leading-snug break-all">{file.original_name}</span>
      </div>

      {/* Status badge */}
      <span className="self-start text-[10px] px-1.5 py-0.5 rounded font-medium"
        style={{ background: `${st.color}20`, color: st.color, border: `1px solid ${st.color}40` }}>
        {st.label}
      </span>

      {/* Domínios com botão de remover */}
      {allDomains.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allDomains.map(d => (
            <span key={d.domain_id} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: `${d.domain_color}20`, color: d.domain_color, border: `1px solid ${d.domain_color}40` }}>
              {d.domain_name}
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={() => onRemoveDomain(file.id, d.domain_id)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                title={`Remover de ${d.domain_name}`}
              >
                <X className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono">{fmt.size(file.size_bytes)} · {fmt.date(file.created_at)}</span>
        <button onPointerDown={e => e.stopPropagation()} onClick={() => onDelete(file.id)}
          className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Excluir">
          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

// ── Wrappers draggable ────────────────────────────────────────

function DraggableStatus({ file, domains, colColor, onReprocess, onDelete }: {
  file: FileType; domains: DomainAssignment[]; colColor: string;
  onReprocess: (id: string) => void; onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: file.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.35 : 1 }}
      {...listeners} {...attributes}>
      <StatusFileCard file={file} domains={domains} colColor={colColor} onReprocess={onReprocess} onDelete={onDelete} />
    </div>
  );
}

// dragId = `${fileId}::${domainId}` — único por coluna
function DraggableDomain({ dragId, file, allDomains, colColor, onRemoveDomain, onDelete }: {
  dragId: string; file: FileType; allDomains: DomainAssignment[]; colColor: string;
  onRemoveDomain: (fileId: string, domainId: string) => void; onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.35 : 1 }}
      {...listeners} {...attributes}>
      <DomainFileCard file={file} allDomains={allDomains} colColor={colColor}
        onRemoveDomain={onRemoveDomain} onDelete={onDelete} />
    </div>
  );
}

// ── Coluna genérica ───────────────────────────────────────────

function KanbanCol({
  colId, label, color, accent, icon, count, expert, children,
}: {
  colId: string; label: string; color: string; accent: string;
  icon: React.ReactNode; count: number; children: React.ReactNode;
  expert?: { name?: string; whatsapp?: string };
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId });
  return (
    <div className="flex flex-col min-h-[500px] w-full">
      <div className="rounded-inner mb-2" style={{ background: accent }}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ color }}>
          {icon}
          <span className="text-sm font-medium">{label}</span>
          <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${color}25` }}>{count}</span>
        </div>
        {expert?.name && (
          <div className="flex items-center gap-1.5 px-3 pb-2 -mt-0.5" style={{ color }}>
            <MessageCircle className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.5} />
            <span className="text-[11px] opacity-80 truncate">{expert.name}</span>
            {expert.whatsapp && (
              <span className="text-[10px] font-mono opacity-50 ml-0.5">{expert.whatsapp}</span>
            )}
          </div>
        )}
      </div>
      <div ref={setNodeRef} className="flex-1 rounded-inner p-2 space-y-2 min-h-[80px] transition-colors"
        style={{
          background: isOver ? accent : 'hsl(var(--secondary) / 0.2)',
          border: `2px dashed ${isOver ? color : 'transparent'}`,
          transition: 'background 0.15s, border-color 0.15s',
        }}>
        {count === 0 && <div className="flex items-center justify-center h-16 text-xs text-muted-foreground opacity-50">Solte aqui</div>}
        {children}
      </div>
    </div>
  );
}

// ── Board de status (Fase 4) ──────────────────────────────────

function StatusBoard({
  files, assignments, onStatusChange, onReprocess, onDelete,
}: {
  files: FileType[]; assignments: Record<string, DomainAssignment[]>;
  onStatusChange: (fileId: string, status: Status) => Promise<void>;
  onReprocess: (id: string) => void; onDelete: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeFile, setActiveFile] = useState<FileType | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveFile(files.find(f => f.id === e.active.id) || null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveFile(null);
    const { active, over } = e;
    if (!over) return;
    const file = files.find(f => f.id === active.id);
    if (!file || file.status === over.id) return;
    onStatusChange(file.id, over.id as Status);
  };

  const byStatus = (s: Status) => files.filter(f => f.status === s);
  const activeCol = activeFile ? STATUS_COLUMNS.find(c => c.id === activeFile.status) : undefined;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(col => (
          <KanbanCol key={col.id} colId={col.id} label={col.label} color={col.color}
            accent={col.accent} icon={col.icon} count={byStatus(col.id).length}>
            {byStatus(col.id).map(file => (
              <DraggableStatus key={file.id} file={file} domains={assignments[file.id] || []}
                colColor={col.color} onReprocess={onReprocess} onDelete={onDelete} />
            ))}
          </KanbanCol>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeFile && activeCol && (
          <StatusFileCard file={activeFile} domains={assignments[activeFile.id] || []}
            colColor={activeCol.color} onReprocess={() => {}} onDelete={() => {}} dragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── Board de domínios (Fase 5) ────────────────────────────────

function DomainBoard({
  files, domains, assignments, onAddDomain, onRemoveDomain, onDelete,
}: {
  files: FileType[]; domains: Domain[];
  assignments: Record<string, DomainAssignment[]>;
  onAddDomain: (fileId: string, domainId: string) => Promise<void>;
  onRemoveDomain: (fileId: string, domainId: string) => void;
  onDelete: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const handleDragStart = (e: DragStartEvent) => { setActiveDragId(e.active.id as string); };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;

    const dragId = active.id as string;
    const targetColId = over.id as string;

    // parse fileId from dragId `fileId::sourceDomainId`
    const fileId = dragId.split('::')[0];
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // Sem Domínio: não faz nada (não remove domínios por drag)
    if (targetColId === NO_DOMAIN_ID) return;

    // Já pertence ao domínio alvo?
    const already = (assignments[fileId] || []).some(d => d.domain_id === targetColId);
    if (already) return;

    onAddDomain(fileId, targetColId);
  };

  // Arquivos por domínio
  const filesByDomain = (domainId: string) => {
    if (domainId === NO_DOMAIN_ID) {
      return files.filter(f => !(assignments[f.id]?.length));
    }
    return files.filter(f => (assignments[f.id] || []).some(d => d.domain_id === domainId));
  };

  // Colunas: domínios + "Sem Domínio"
  const domainCols = [
    ...domains.map(d => ({
      id: d.id, label: d.name, color: d.color,
      accent: `${d.color}18`, icon: <Layers className="h-4 w-4" strokeWidth={1.5} />,
      expert: d.expert_name ? { name: d.expert_name, whatsapp: d.expert_whatsapp } : undefined,
    })),
    {
      id: NO_DOMAIN_ID, label: 'Sem Domínio',
      color: 'hsl(220 15% 50%)', accent: 'hsl(220 15% 50% / 0.10)',
      icon: <FileText className="h-4 w-4" strokeWidth={1.5} />,
      expert: undefined,
    },
  ];

  // Info para overlay
  const activeFileId = activeDragId?.split('::')[0];
  const activeFile = activeFileId ? files.find(f => f.id === activeFileId) : undefined;
  const activeDomainId = activeDragId?.split('::')[1];
  const activeCol = activeDomainId
    ? domainCols.find(c => c.id === activeDomainId)
    : domainCols[domainCols.length - 1];

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {domainCols.map(col => {
          const colFiles = filesByDomain(col.id);
          return (
            <KanbanCol key={col.id} colId={col.id} label={col.label} color={col.color}
              accent={col.accent} icon={col.icon} count={colFiles.length} expert={col.expert}>
              {colFiles.map(file => {
                const dragId = `${file.id}::${col.id}`;
                return (
                  <DraggableDomain key={dragId} dragId={dragId} file={file}
                    allDomains={assignments[file.id] || []} colColor={col.color}
                    onRemoveDomain={onRemoveDomain} onDelete={onDelete} />
                );
              })}
            </KanbanCol>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeFile && activeCol && (
          <DomainFileCard file={activeFile} allDomains={assignments[activeFile.id] || []}
            colColor={activeCol.color} onRemoveDomain={() => {}} onDelete={() => {}} dragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ── Página principal ──────────────────────────────────────────

export default function Kanban() {
  const [files, setFiles] = useState<FileType[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [assignments, setAssignments] = useState<Record<string, DomainAssignment[]>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('status');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [filesRes, assignmentsRes, domainsRes] = await Promise.all([
        listFiles({ limit: 200 }),
        api.get('/domains/assignments'),
        api.get('/domains'),
      ]);
      setFiles(filesRes.data);
      setAssignments(assignmentsRes.data);
      setDomains(domainsRes.data);
    } catch (err) {
      console.error('Erro ao carregar kanban:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    pollRef.current = setInterval(loadData, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadData]);

  // ── Handlers de status ──────────────────────────────────────

  const handleStatusChange = async (fileId: string, newStatus: Status) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: newStatus } : f));
    try {
      await api.patch(`/files/${fileId}/status`, { status: newStatus });
    } catch (err: any) {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: file.status } : f));
      alert(err.response?.data?.message || 'Erro ao mover arquivo');
    }
  };

  const handleReprocess = async (fileId: string) => {
    if (!confirm('Iniciar reprocessamento?')) return;
    try {
      await api.post(`/files/${fileId}/reprocess`);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'processing' as Status } : f));
    } catch (err: any) { alert(err.response?.data?.message || 'Erro ao reprocessar'); }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Excluir arquivo? Esta ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/files/${fileId}`);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err: any) { alert(err.response?.data?.message || 'Erro ao excluir'); }
  };

  // ── Handlers de domínio ─────────────────────────────────────

  const handleAddDomain = async (fileId: string, domainId: string) => {
    // Optimistic
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return;
    setAssignments(prev => ({
      ...prev,
      [fileId]: [...(prev[fileId] || []), { domain_id: domain.id, domain_name: domain.name, domain_color: domain.color }],
    }));
    try {
      await api.post(`/domains/${domainId}/files`, { file_ids: [fileId] });
    } catch (err: any) {
      // Rollback
      setAssignments(prev => ({
        ...prev,
        [fileId]: (prev[fileId] || []).filter(d => d.domain_id !== domainId),
      }));
      alert(err.response?.data?.message || 'Erro ao atribuir domínio');
    }
  };

  const handleRemoveDomain = async (fileId: string, domainId: string) => {
    const prev_assignments = assignments[fileId] || [];
    // Optimistic
    setAssignments(prev => ({
      ...prev,
      [fileId]: (prev[fileId] || []).filter(d => d.domain_id !== domainId),
    }));
    try {
      await api.delete(`/domains/${domainId}/files/${fileId}`);
    } catch (err: any) {
      // Rollback
      setAssignments(prev => ({ ...prev, [fileId]: prev_assignments }));
      alert(err.response?.data?.message || 'Erro ao remover domínio');
    }
  };

  // ── Render ──────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-medium text-foreground">Kanban</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {viewMode === 'status'
              ? 'Arraste para mudar o status de processamento'
              : 'Arraste para adicionar domínios · clique × para remover'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle de modo */}
          <div className="flex gap-0.5 bg-secondary/50 rounded-inner p-0.5">
            <button
              onClick={() => setViewMode('status')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-inner text-xs font-medium transition-colors ${
                viewMode === 'status' ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <KanbanSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
              Por Status
            </button>
            <button
              onClick={() => setViewMode('domain')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-inner text-xs font-medium transition-colors ${
                viewMode === 'domain' ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
              Por Domínio
            </button>
          </div>

          <button
            onClick={() => { setLoading(true); loadData(); }}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Aviso quando não há domínios no modo domínio */}
      {viewMode === 'domain' && domains.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-outer border border-border/40 p-6 text-center text-sm text-muted-foreground">
          Nenhum domínio cadastrado.{' '}
          <a href="/admin/domains" className="text-primary hover:underline">Criar domínios</a>
          {' '}para usar esta visualização.
        </motion.div>
      )}

      {/* Board */}
      <AnimatePresence mode="wait">
        <motion.div key={viewMode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {viewMode === 'status' ? (
            <StatusBoard
              files={files}
              assignments={assignments}
              onStatusChange={handleStatusChange}
              onReprocess={handleReprocess}
              onDelete={handleDelete}
            />
          ) : (
            <DomainBoard
              files={files}
              domains={domains}
              assignments={assignments}
              onAddDomain={handleAddDomain}
              onRemoveDomain={handleRemoveDomain}
              onDelete={handleDelete}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
