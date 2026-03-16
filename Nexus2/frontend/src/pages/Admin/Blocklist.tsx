import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, ShieldOff, Search, Edit3, Copy, Check } from 'lucide-react';

interface BlocklistEntry {
  id: string;
  number: string;
  label?: string;
  reason?: string;
  added_by_name?: string;
  created_at: string;
  updated_at: string;
}

type FormData = { number: string; label: string; reason: string };
const emptyForm: FormData = { number: '', label: '', reason: '' };

function EntryModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: BlocklistEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(
    entry ? { number: entry.number, label: entry.label || '', reason: entry.reason || '' } : emptyForm,
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (entry) {
        await api.patch(`/blocklist/${entry.id}`, {
          label: form.label || undefined,
          reason: form.reason || undefined,
        });
      } else {
        await api.post('/blocklist', {
          number: form.number.trim(),
          label: form.label || undefined,
          reason: form.reason || undefined,
        });
      }
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md"
        style={{ background: 'linear-gradient(145deg, hsl(240 10% 6%) 0%, hsl(230 15% 9%) 100%)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-foreground">
            {entry ? 'Editar entrada' : 'Adicionar número'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Número WhatsApp
              <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                formato internacional sem + (ou remoteJid do WhatsApp)
              </span>
            </label>
            <input
              type="text"
              value={form.number}
              onChange={set('number')}
              className="input font-mono"
              placeholder="5511999998888 ou 5511999998888@g.us"
              required
              disabled={!!entry}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Identificação</label>
            <input
              type="text"
              value={form.label}
              onChange={set('label')}
              className="input"
              placeholder="Ex: Grupo Família, Cliente XYZ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Motivo do bloqueio</label>
            <textarea
              value={form.reason}
              onChange={set('reason')}
              className="input resize-none text-sm"
              rows={2}
              placeholder="Ex: Número pessoal, fora do escopo do assistente"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Salvando...' : entry ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      title="Copiar"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" strokeWidth={2} /> : <Copy className="h-3 w-3" strokeWidth={1.5} />}
    </button>
  );
}

export default function AdminBlocklist() {
  const [entries, setEntries] = useState<BlocklistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editEntry, setEditEntry] = useState<BlocklistEntry | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async (q = '') => {
    try {
      const res = await api.get('/blocklist', { params: { search: q || undefined, limit: 100 } });
      setEntries(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Erro ao carregar blocklist:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Remover "${number}" da blocklist?`)) return;
    try {
      await api.delete(`/blocklist/${id}`);
      load(search);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao remover');
    }
  };

  const openCreate = () => { setEditEntry(null); setShowModal(true); };
  const openEdit = (e: BlocklistEntry) => { setEditEntry(e); setShowModal(true); };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-medium text-foreground">Blocklist WhatsApp</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Números ignorados pelo agente n8n · {total} entrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Adicionar número
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
          placeholder="Buscar por número ou identificação..."
        />
      </div>

      {/* Info n8n */}
      <div className="rounded-outer border border-border/40 p-4 bg-secondary/20 space-y-2">
        <p className="text-xs font-medium text-foreground">Integração n8n</p>
        <p className="text-xs text-muted-foreground">
          No início do workflow WhatsApp, adicione um nó <strong className="text-foreground">HTTP Request</strong> para verificar se o remetente está bloqueado:
        </p>
        <div className="font-mono text-[11px] bg-black/30 rounded-inner p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">GET</span>
            <span className="text-primary break-all">{'{{$env.API_URL}}/blocklist/check/{{$json.remoteJid}}'}</span>
            <CopyButton text="{{$env.API_URL}}/blocklist/check/{{$json.remoteJid}}" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Header</span>
            <span className="text-yellow-400">Authorization: Bearer {'{{$env.BLOCKLIST_WEBHOOK_TOKEN}}'}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Adicione um nó <strong className="text-foreground">IF</strong> verificando{' '}
          <code className="text-primary text-[11px]">{'{{$json.blocked}} === true'}</code> e encerre o fluxo se verdadeiro.
        </p>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-center text-muted-foreground py-16">Carregando...</div>
      ) : entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-outer border border-border/40 p-12 text-center text-muted-foreground"
        >
          <ShieldOff className="h-8 w-8 mx-auto mb-3 opacity-30" strokeWidth={1} />
          {search ? 'Nenhum resultado para esta busca.' : 'Blocklist vazia.'}
          {!search && (
            <>
              <br />
              <button onClick={openCreate} className="text-primary hover:underline mt-2 inline-block">
                Adicionar o primeiro número
              </button>
            </>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-outer border border-border/40 overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Número</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Identificação</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Motivo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Adicionado</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {entries.map((entry, i) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/20 hover:bg-secondary/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-foreground">{entry.number}</span>
                        <CopyButton text={entry.number} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {entry.label || <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                      {entry.reason || <span className="opacity-40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                      <div>{fmt(entry.created_at)}</div>
                      {entry.added_by_name && (
                        <div className="opacity-60">{entry.added_by_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 justify-end">
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-primary"
                          title="Editar"
                        >
                          <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, entry.number)}
                          className="p-1.5 hover:bg-destructive/10 rounded-inner transition-colors text-muted-foreground hover:text-destructive"
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}

      {showModal && (
        <EntryModal
          entry={editEntry}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(search); }}
        />
      )}
    </div>
  );
}
