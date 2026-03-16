import { useEffect, useState } from 'react';
import { api, File, Domain, DomainAssignment, listFiles, deleteFile, getFileDownloadUrl } from '../lib/api';
import { motion } from 'framer-motion';
import { Upload, Download, Trash2, RotateCcw, X, Layers, Plus, Check } from 'lucide-react';

type Tab = 'processed' | 'pending';

// Modal de gerenciamento de domínios de um arquivo
function DomainManagerModal({
  file,
  domains,
  currentDomains,
  onClose,
  onSaved,
}: {
  file: File;
  domains: Domain[];
  currentDomains: DomainAssignment[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const assigned = new Set(currentDomains.map(d => d.domain_id));
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (domain: Domain) => {
    setSaving(domain.id);
    try {
      if (assigned.has(domain.id)) {
        await api.delete(`/domains/${domain.id}/files/${file.id}`);
      } else {
        await api.post(`/domains/${domain.id}/files`, { file_ids: [file.id] });
      }
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao atualizar domínio');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-sm"
        style={{ background: 'linear-gradient(145deg, hsl(240 10% 6%) 0%, hsl(230 15% 9%) 100%)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-foreground">Domínios</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">{file.original_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum domínio cadastrado. Crie domínios em{' '}
            <span className="text-primary">Domínios de Conhecimento</span>.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {domains.map(domain => {
              const isAssigned = assigned.has(domain.id);
              return (
                <button
                  key={domain.id}
                  onClick={() => toggle(domain)}
                  disabled={saving === domain.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-inner text-sm transition-colors hover:bg-secondary/40 disabled:opacity-60"
                >
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: domain.color }} />
                  <span className="flex-1 text-left text-foreground">{domain.name}</span>
                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isAssigned ? 'border-primary bg-primary/20' : 'border-border/60'
                  }`}>
                    {isAssigned && <Check className="h-2.5 w-2.5 text-primary" strokeWidth={2.5} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border/30 text-right">
          <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Files() {
  const [processedFiles, setProcessedFiles] = useState<File[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loadingProcessed, setLoadingProcessed] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileInput, setSelectedFileInput] = useState<any>(null);

  // Domínios
  const [domains, setDomains] = useState<Domain[]>([]);
  const [assignments, setAssignments] = useState<Record<string, DomainAssignment[]>>({});
  const [domainFile, setDomainFile] = useState<File | null>(null);

  const loadDomains = async () => {
    try {
      const [domainsRes, assignmentsRes] = await Promise.all([
        api.get('/domains'),
        api.get('/domains/assignments'),
      ]);
      setDomains(domainsRes.data);
      setAssignments(assignmentsRes.data);
    } catch (err) {
      console.error('Erro ao carregar domínios:', err);
    }
  };

  useEffect(() => {
    loadProcessed();
    loadPending();
    loadDomains();
  }, []);

  const loadProcessed = async () => {
    try {
      const response = await listFiles({ status: 'processed' });
      setProcessedFiles(response.data);
    } catch (error) {
      console.error('Error loading processed files:', error);
    } finally {
      setLoadingProcessed(false);
    }
  };

  const loadPending = async () => {
    try {
      const response = await listFiles({});
      const allFiles = response.data as File[];
      const pending = allFiles.filter(f => f.status !== 'processed');
      setPendingFiles(pending);
    } catch (error) {
      console.error('Error loading pending files:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const refreshCurrentTab = () => {
    if (activeTab === 'processed') loadProcessed();
    else loadPending();
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFileInput) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFileInput);
      await api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadModal(false);
      setSelectedFileInput(null);
      loadPending();
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || 'Erro ao upload');
    } finally {
      setUploading(false);
    }
  };

  const handleReprocess = async (fileId: string) => {
    if (!confirm('Iniciar reprocessamento?')) return;
    try {
      await api.post(`/files/${fileId}/reprocess`);
      alert('Reprocessamento iniciado');
      loadPending();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao reprocessar');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteFile(fileId);
      refreshCurrentTab();
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || 'Erro ao deletar');
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const info = await getFileDownloadUrl(fileId);
      if (info?.url) window.open(info.url, '_blank');
      else alert('URL de download não disponível.');
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || 'Erro ao obter link de download');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      uploaded: { bg: 'hsl(217 70% 55% / 0.15)', text: 'hsl(217 70% 65%)' },
      processing: { bg: 'hsl(38 90% 55% / 0.15)', text: 'hsl(38 90% 65%)' },
      processed: { bg: 'hsl(150 50% 45% / 0.15)', text: 'hsl(150 50% 55%)' },
      error: { bg: 'hsl(0 62% 50% / 0.15)', text: 'hsl(0 62% 65%)' },
    };
    const s = styles[status] || { bg: 'hsl(240 4% 14%)', text: 'hsl(0 0% 70%)' };
    return (
      <span className="px-2.5 py-1 rounded-inner text-xs font-medium" style={{ background: s.bg, color: s.text }}>
        {status}
      </span>
    );
  };

  const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  const formatDate = (d: string) => new Date(d).toLocaleString('pt-BR');

  const currentFiles = activeTab === 'processed' ? processedFiles : pendingFiles;
  const loading = activeTab === 'processed' ? loadingProcessed : loadingPending;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-foreground">Arquivos</h1>
        <button onClick={() => setUploadModal(true)} className="btn-primary flex items-center gap-2">
          <Upload className="h-4 w-4" strokeWidth={1.5} />
          Upload
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-secondary/50 rounded-inner p-1 w-fit">
        {(['pending', 'processed'] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`text-xs px-4 py-2 rounded-inner transition-colors ${
              activeTab === tab ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'pending' ? `Não Processados (${pendingFiles.length})` : `Processados (${processedFiles.length})`}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card overflow-hidden p-0"
      >
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : currentFiles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum arquivo{activeTab === 'processed' ? ' processado' : ' pendente'} ainda.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr className="border-b border-border/60">
                <th className="table-th">Nome</th>
                <th className="table-th">Domínios</th>
                <th className="table-th">Tamanho</th>
                <th className="table-th">Status</th>
                <th className="table-th">Upload</th>
                <th className="table-th">Usuário</th>
                <th className="table-th text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {currentFiles.map(file => {
                const fileDomains = assignments[file.id] || [];
                return (
                  <tr key={file.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="table-td font-medium">{file.original_name}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 flex-wrap">
                        {fileDomains.map(d => (
                          <span
                            key={d.domain_id}
                            className="px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{
                              background: `${d.domain_color}22`,
                              color: d.domain_color,
                              border: `1px solid ${d.domain_color}44`,
                            }}
                          >
                            {d.domain_name}
                          </span>
                        ))}
                        <button
                          onClick={() => setDomainFile(file)}
                          className="p-0.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
                          title="Gerenciar domínios"
                        >
                          <Plus className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                    <td className="table-td font-mono text-muted-foreground text-xs">{formatSize(file.size_bytes)}</td>
                    <td className="table-td">{getStatusBadge(file.status)}</td>
                    <td className="table-td text-muted-foreground text-xs">{formatDate(file.created_at)}</td>
                    <td className="table-td text-muted-foreground">{file.uploader?.name || '-'}</td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleDownload(file.id)}
                          className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-foreground"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setDomainFile(file)}
                          className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-primary"
                          title="Domínios"
                        >
                          <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        {activeTab === 'pending' && file.status === 'error' && (
                          <button
                            onClick={() => handleReprocess(file.id)}
                            className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-warning hover:text-warning"
                            title="Reprocessar"
                          >
                            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded-inner transition-colors text-muted-foreground hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-md"
            style={{ background: 'linear-gradient(145deg, hsl(240 10% 6%) 0%, hsl(230 15% 9%) 100%)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">Upload de Arquivo</h2>
              <button
                onClick={() => setUploadModal(false)}
                className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Selecione o arquivo</label>
                <div className="border-2 border-dashed border-border/60 rounded-inner p-6 text-center hover:border-border transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
                  <input
                    type="file"
                    onChange={e => setSelectedFileInput(e.target.files?.[0] || null)}
                    className="w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-inner file:border-0 file:text-xs file:font-medium file:bg-primary/15 file:text-primary hover:file:bg-primary/25 file:cursor-pointer file:transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setUploadModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={uploading || !selectedFileInput} className="btn-primary disabled:opacity-50">
                  {uploading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Domain Manager Modal */}
      {domainFile && (
        <DomainManagerModal
          file={domainFile}
          domains={domains}
          currentDomains={assignments[domainFile.id] || []}
          onClose={() => setDomainFile(null)}
          onSaved={() => {
            loadDomains();
          }}
        />
      )}
    </div>
  );
}
