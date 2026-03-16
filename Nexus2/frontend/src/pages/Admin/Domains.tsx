import { useEffect, useState } from 'react';
import { api, Domain } from '../../lib/api';
import { motion } from 'framer-motion';
import { Plus, Edit3, Trash2, X, Layers, MessageCircle } from 'lucide-react';

const PRESET_COLORS = [
  '#00d4d4', '#0a2f5f', '#c8ff00', '#6366f1', '#f59e0b',
  '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f97316',
];

type FormData = {
  name: string;
  description: string;
  color: string;
  expert_name: string;
  expert_whatsapp: string;
  expert_fallback_message: string;
};

const emptyForm: FormData = {
  name: '',
  description: '',
  color: '#00d4d4',
  expert_name: '',
  expert_whatsapp: '',
  expert_fallback_message: '',
};

function DomainModal({
  domain,
  onClose,
  onSaved,
}: {
  domain: Domain | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(
    domain
      ? {
          name: domain.name,
          description: domain.description || '',
          color: domain.color,
          expert_name: domain.expert_name || '',
          expert_whatsapp: domain.expert_whatsapp || '',
          expert_fallback_message: domain.expert_fallback_message || '',
        }
      : emptyForm,
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        color: form.color,
        expert_name: form.expert_name || undefined,
        expert_whatsapp: form.expert_whatsapp || undefined,
        expert_fallback_message: form.expert_fallback_message || undefined,
      };
      if (domain) {
        await api.patch(`/domains/${domain.id}`, payload);
      } else {
        await api.post('/domains', payload);
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
        className="card w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background: 'linear-gradient(145deg, hsl(240 10% 6%) 0%, hsl(230 15% 9%) 100%)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium text-foreground">
            {domain ? 'Editar Domínio' : 'Novo Domínio'}
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
            <label className="block text-sm font-medium text-foreground mb-1.5">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              className="input"
              placeholder="Ex: Contabilidade, RH, Jurídico"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Descrição</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              className="input resize-none text-sm"
              rows={2}
              placeholder="Descreva o escopo deste domínio de conhecimento"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Cor de identificação</label>
            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: c,
                    borderColor: form.color === c ? 'white' : 'transparent',
                  }}
                />
              ))}
            </div>
            {/* Custom color picker */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={set('color')}
                className="h-8 w-10 rounded cursor-pointer border-0 bg-transparent"
              />
              <input
                type="text"
                value={form.color}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setForm(f => ({ ...f, color: v }));
                }}
                className="input w-28 text-sm font-mono"
                placeholder="#000000"
              />
              <span
                className="flex-1 h-8 rounded-inner"
                style={{ background: form.color }}
              />
            </div>
          </div>

          {/* Especialista WhatsApp */}
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Especialista WhatsApp
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nome do especialista</label>
                <input
                  type="text"
                  value={form.expert_name}
                  onChange={set('expert_name')}
                  className="input"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Número WhatsApp
                  <span className="text-xs text-muted-foreground ml-1.5 font-normal">formato internacional sem +</span>
                </label>
                <input
                  type="text"
                  value={form.expert_whatsapp}
                  onChange={set('expert_whatsapp')}
                  className="input font-mono"
                  placeholder="5511999998888"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Mensagem de fallback</label>
                <textarea
                  value={form.expert_fallback_message}
                  onChange={set('expert_fallback_message')}
                  className="input resize-none text-sm"
                  rows={3}
                  placeholder="Mensagem padrão enviada ao especialista quando não há resposta automática"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Salvando...' : domain ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDomain, setEditDomain] = useState<Domain | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/domains?all=true');
      setDomains(res.data);
    } catch (err) {
      console.error('Erro ao carregar domínios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover domínio "${name}"? Os arquivos não serão excluídos.`)) return;
    try {
      await api.delete(`/domains/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao remover');
    }
  };

  const openCreate = () => { setEditDomain(null); setShowModal(true); };
  const openEdit = (d: Domain) => { setEditDomain(d); setShowModal(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground">Domínios de Conhecimento</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Categorize os arquivos por área de conhecimento
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Novo Domínio
        </button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-16">Carregando...</div>
      ) : domains.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-outer border border-border/40 p-12 text-center text-muted-foreground"
        >
          <Layers className="h-8 w-8 mx-auto mb-3 opacity-30" strokeWidth={1} />
          Nenhum domínio cadastrado ainda.
          <br />
          <button onClick={openCreate} className="text-primary hover:underline mt-2 inline-block">
            Criar o primeiro domínio
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {domains.map(domain => (
            <div
              key={domain.id}
              className="rounded-outer border border-border/40 p-4 flex flex-col gap-3 hover:border-border/70 transition-colors"
              style={{ background: `${domain.color}0d` /* 5% opacidade */ }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ background: domain.color }}
                  />
                  <span className="text-sm font-semibold text-foreground">{domain.name}</span>
                  {!domain.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      inativo
                    </span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(domain)}
                    className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-primary"
                    title="Editar"
                  >
                    <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => handleDelete(domain.id, domain.name)}
                    className="p-1.5 hover:bg-destructive/10 rounded-inner transition-colors text-muted-foreground hover:text-destructive"
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {domain.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {domain.description}
                </p>
              )}

              {domain.expert_name && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageCircle className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                  <span className="font-medium text-foreground/80">{domain.expert_name}</span>
                  {domain.expert_whatsapp && (
                    <span className="font-mono opacity-60">{domain.expert_whatsapp}</span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/20">
                <span className="text-xs text-muted-foreground">
                  {domain.file_count} arquivo{domain.file_count !== 1 ? 's' : ''}
                </span>
                <div
                  className="h-4 w-4 rounded"
                  style={{ background: domain.color }}
                  title={domain.color}
                />
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {showModal && (
        <DomainModal
          domain={editDomain}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); setLoading(true); load(); }}
        />
      )}
    </div>
  );
}
