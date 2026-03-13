import { useEffect, useState } from 'react';
import { api, KnowledgeItem } from '../lib/api';

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
        <h1 className="text-2xl font-bold text-secondary">Base de Conhecimento</h1>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 input"
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum item encontrado.
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item) => (
              <div key={item.id} className="border-b pb-6 last:border-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {item.title && <h3 className="font-semibold text-lg mb-2">{item.title}</h3>}
                    <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                    {(item.file || item.creator) && (
                      <div className="mt-2 text-xs text-gray-500">
                        {item.file && (
                          <span className="mr-4">📄 {item.file.original_name}</span>
                        )}
                        {item.creator && (
                          <span>👤 {item.creator.name} • {formatDate(item.created_at)}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-primary text-sm hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Editar Item</h2>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-64 p-3 border rounded-lg"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-4 py-2"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
