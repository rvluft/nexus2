import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, Clock, CheckCircle2, AlertCircle,
  Loader2, MessageCircle, ChevronDown,
} from 'lucide-react';

interface Ticket {
  id: string; ticket_number: string; status: string; priority: string;
  requester_number: string; requester_name?: string; subject?: string;
  specialist_name?: string; specialist_whatsapp?: string;
  opened_at: string; first_response_at?: string; resolved_at?: string;
  first_response_minutes?: number; resolution_minutes?: number;
  first_response_breached: boolean; resolution_breached: boolean;
  domain_name?: string; domain_color?: string;
}

const STATUS_CFG: Record<string, { label: string; color: string; Icon: any }> = {
  open:                { label: 'Aberto',        color: '#6366f1', Icon: Clock },
  awaiting_specialist: { label: 'Aguardando esp.', color: '#f59e0b', Icon: Loader2 },
  in_progress:         { label: 'Em andamento',  color: '#0ea5e9', Icon: Loader2 },
  resolved:            { label: 'Resolvido',     color: '#22c55e', Icon: CheckCircle2 },
  closed:              { label: 'Fechado',       color: '#64748b', Icon: CheckCircle2 },
};
const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Baixa',    color: '#64748b' },
  normal: { label: 'Normal',   color: '#6366f1' },
  high:   { label: 'Alta',     color: '#f59e0b' },
  urgent: { label: 'Urgente',  color: '#ef4444' },
};

const min2h = (m?: number) => {
  if (!m) return '—';
  if (m < 60) return `${m}m`;
  return `${(m / 60).toFixed(1)}h`;
};
const fmtDate = (d: string) =>
  new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// ── Create/Edit modal ─────────────────────────────────────────

function TicketModal({ ticket, domains, onClose, onSaved }: {
  ticket: Ticket | null; domains: any[]; onClose: () => void; onSaved: () => void;
}) {
  type F = { requester_number: string; requester_name: string; domain_id: string;
    specialist_name: string; specialist_whatsapp: string; subject: string;
    message_preview: string; priority: string; status: string; };
  const [form, setForm] = useState<F>(ticket ? {
    requester_number: ticket.requester_number, requester_name: ticket.requester_name || '',
    domain_id: '', specialist_name: ticket.specialist_name || '',
    specialist_whatsapp: ticket.specialist_whatsapp || '', subject: ticket.subject || '',
    message_preview: '', priority: ticket.priority, status: ticket.status,
  } : { requester_number: '', requester_name: '', domain_id: '', specialist_name: '',
    specialist_whatsapp: '', subject: '', message_preview: '', priority: 'normal', status: 'open' });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (ticket) {
        await api.patch(`/tickets/${ticket.id}`, {
          status: form.status, priority: form.priority,
          specialist_name: form.specialist_name || undefined,
          specialist_whatsapp: form.specialist_whatsapp || undefined,
          subject: form.subject || undefined,
        });
      } else {
        await api.post('/tickets', {
          requester_number: form.requester_number, requester_name: form.requester_name || undefined,
          domain_id: form.domain_id || undefined, specialist_name: form.specialist_name || undefined,
          specialist_whatsapp: form.specialist_whatsapp || undefined,
          subject: form.subject || undefined, message_preview: form.message_preview || undefined,
          priority: form.priority,
        });
      }
      onSaved();
    } catch (err: any) { alert(err.response?.data?.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const inp = (label: string, k: keyof F, placeholder?: string, mono?: boolean) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <input type="text" value={form[k]} onChange={set(k)} className={`input${mono ? ' font-mono' : ''}`} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: 'linear-gradient(145deg, hsl(240 10% 6%) 0%, hsl(230 15% 9%) 100%)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium">{ticket ? `Ticket ${ticket.ticket_number}` : 'Novo Ticket'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!ticket && inp('Número WhatsApp', 'requester_number', '5511999998888', true)}
          {!ticket && inp('Nome do solicitante', 'requester_name', 'Opcional')}
          {!ticket && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Domínio</label>
              <select value={form.domain_id} onChange={set('domain_id')} className="input">
                <option value="">Sem domínio</option>
                {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          {inp('Assunto', 'subject', 'Breve descrição do atendimento')}
          {inp('Especialista', 'specialist_name', 'Nome do especialista')}
          {inp('WhatsApp especialista', 'specialist_whatsapp', '5511999998888', true)}
          {!ticket && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Mensagem inicial</label>
              <textarea value={form.message_preview} onChange={set('message_preview')} className="input resize-none text-sm" rows={2} placeholder="Prévia da mensagem" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Prioridade</label>
              <select value={form.priority} onChange={set('priority')} className="input">
                {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {ticket && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                <select value={form.status} onChange={set('status')} className="input">
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Salvando...' : ticket ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [edit, setEdit]       = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [domains, setDomains]  = useState<any[]>([]);

  const load = useCallback(async (q = '', st = '') => {
    try {
      const [res, dom] = await Promise.all([
        api.get('/tickets', { params: { search: q || undefined, status: st || undefined, limit: 100 } }),
        api.get('/domains'),
      ]);
      setTickets(res.data.data); setTotal(res.data.total);
      setDomains(dom.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(search, statusFilter); }, [search, statusFilter, load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-medium text-foreground">Tickets de Suporte</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{total} ticket{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEdit(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Novo Ticket
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Buscar por número, assunto, ticket..." />
        </div>
        <div className="flex gap-0.5 bg-secondary/50 rounded-inner p-0.5">
          {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => {
            const cfg = s ? STATUS_CFG[s] : null;
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-inner text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {s === '' ? 'Todos' : cfg?.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-16">Carregando...</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-outer border border-border/40 p-12 text-center text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-3 opacity-30" strokeWidth={1} />
          Nenhum ticket encontrado.
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-outer border border-border/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-secondary/30">
                {['Ticket','Status','Prioridade','Solicitante','Domínio','Especialista','1ª Resp.','Resolução','Aberto em',''].map((h, i) => (
                  <th key={i} className={`text-left px-3 py-3 text-xs font-medium text-muted-foreground ${i >= 4 && i <= 7 ? 'hidden lg:table-cell' : ''} ${i === 8 ? 'hidden xl:table-cell' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {tickets.map((t, i) => {
                  const st = STATUS_CFG[t.status] ?? STATUS_CFG.open;
                  const pr = PRIORITY_CFG[t.priority] ?? PRIORITY_CFG.normal;
                  return (
                    <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.01 }}
                      className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                      <td className="px-3 py-3 font-mono text-xs text-primary">{t.ticket_number}</td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-inner font-medium w-fit"
                          style={{ background: `${st.color}20`, color: st.color, border: `1px solid ${st.color}40` }}>
                          <st.Icon className="h-2.5 w-2.5" strokeWidth={1.5} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: `${pr.color}20`, color: pr.color }}>{pr.label}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-medium text-foreground">{t.requester_name || '—'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{t.requester_number}</div>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        {t.domain_name ? (
                          <span className="flex items-center gap-1 text-xs">
                            {t.domain_color && <div className="h-2 w-2 rounded-full" style={{ background: t.domain_color }} />}
                            {t.domain_name}
                          </span>
                        ) : <span className="opacity-30 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground">{t.specialist_name || '—'}</td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className={`text-xs font-mono ${t.first_response_breached ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {min2h(t.first_response_minutes)}
                          {t.first_response_breached && <AlertCircle className="h-3 w-3 inline ml-0.5" strokeWidth={1.5} />}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className={`text-xs font-mono ${t.resolution_breached ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {min2h(t.resolution_minutes)}
                          {t.resolution_breached && <AlertCircle className="h-3 w-3 inline ml-0.5" strokeWidth={1.5} />}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell text-xs text-muted-foreground">{fmtDate(t.opened_at)}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => { setEdit(t); setShowModal(true); }}
                          className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-primary">
                          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}

      {showModal && (
        <TicketModal ticket={edit} domains={domains} onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(search, statusFilter); }} />
      )}
    </div>
  );
}
