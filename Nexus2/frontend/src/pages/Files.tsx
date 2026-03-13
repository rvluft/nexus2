import { useEffect, useState } from 'react';
import { api, File } from '../lib/api';

export default function Files() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileInput, setSelectedFileInput] = useState<any>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await api.get('/files');
      setFiles(response.data.data);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileInput) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFileInput);

      await api.post('/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadModal(false);
      setSelectedFileInput(null);
      loadFiles();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao upload');
    } finally {
      setUploading(false);
    }
  };

  const handleReprocess = async (fileId: string) => {
    if (!confirm('Iniciar reprocessamento?')) return;

    try {
      await api.post(`/files/${fileId}/reprocess`);
      alert('Reprocessamento iniciado');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao reprocessar');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;

    try {
      await api.delete(`/files/${fileId}`);
      loadFiles();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao deletar');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      uploaded: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      processed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}
      >
        {status}
      </span>
    );
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-secondary">Arquivos</h1>
        <button onClick={() => setUploadModal(true)} className="btn-primary">
          + Upload
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Carregando...</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum arquivo enviado ainda.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="table-th">Nome</th>
                <th className="table-th">Tamanho</th>
                <th className="table-th">Status</th>
                <th className="table-th">Upload</th>
                <th className="table-th">Usuário</th>
                <th className="table-th text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{file.original_name}</td>
                  <td className="table-td">{formatSize(file.size_bytes)}</td>
                  <td className="table-td">{getStatusBadge(file.status)}</td>
                  <td className="table-td">{formatDate(file.created_at)}</td>
                  <td className="table-td">{file.uploader?.name || '-'}</td>
                  <td className="table-td text-right space-x-2">
                    {file.status === 'error' && (
                      <button
                        onClick={() => handleReprocess(file.id)}
                        className="text-xs text-accent hover:underline"
                      >
                        Reprocessar
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Upload de Arquivo</h2>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Selecione o arquivo
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFileInput(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setUploadModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFileInput}
                  className="btn-primary px-4 py-2"
                >
                  {uploading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
