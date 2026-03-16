import { useEffect, useState } from 'react';
import { api, KnowledgeItem } from '../lib/api';
import { motion } from 'framer-motion';
import { Search, Edit3, Trash2, X, FileText, User } from 'lucide-react';

export default function Knowledge() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadKnowledge();
  }, [search]);

  const loadKnowledge = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      const response = await api.get('/knowledge', { params });
      setItems(response.data.data);
    } catch (error) {
      console.error('Error loading knowledge:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setEditContent(item.content);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await api.patch(`/knowledge/${editingItem.id}`, { content: editContent });
      setEditingItem(null);
      setEditContent('');
      loadKnowledge();
    } catch (error: any) {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Remover este item?')) return;
    try {
      await api.delete(`/knowledge/${itemId}`);
      loadKnowledge();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao remover');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-foreground">Base de Conhecimento</h1>
        <div className="flex items-center gap-2 bg-secondary rounded-inner px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-48"
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card"
      >
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum item encontrado.
          </div>
        ) : (
          <div className="space-y-0">
            {items.map((item, i) => (
              <div
                key={item.id}
                className={`py-4 hover:bg-secondary/20 -mx-2 px-2 rounded-inner transition-colors ${
                  i !== items.length - 1 ? 'border-b border-border/30' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {item.title && (
                      <h3 className="font-medium text-foreground mb-1">{item.title}</h3>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {item.content}
                    </p>
                    {(item.file || item.creator) && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        {item.file && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" strokeWidth={1.5} />
                            {item.file.original_name}
                          </span>
                        )}
                        {item.creator && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" strokeWidth={1.5} />
                            {item.creator.name} • {formatDate(item.created_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-primary"
                      title="Editar"
                    >
                      <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded-inner transition-colors text-muted-foreground hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(145deg, hsl(240 10% 6%) 0%, hsl(230 15% 9%) 100%)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">Editar Item</h2>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="input h-64 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingItem(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
