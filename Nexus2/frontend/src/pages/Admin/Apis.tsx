import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { motion } from 'framer-motion';
import { Save, Settings } from 'lucide-react';

export default function AdminApis() {
  const [config, setConfig] = useState({
    N8N_BASE_URL: '',
    N8N_FILES_WORKFLOW_UPLOAD_URL: '',
    N8N_WEBHOOK_STATUS_URL: '',
    API_PUBLIC_URL: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await api.get('/admin/config');
      setConfig({
        N8N_BASE_URL: data['N8N_BASE_URL'] || '',
        N8N_FILES_WORKFLOW_UPLOAD_URL: data['N8N_FILES_WORKFLOW_UPLOAD_URL'] || '',
        N8N_WEBHOOK_STATUS_URL: data['N8N_WEBHOOK_STATUS_URL'] || '',
        API_PUBLIC_URL: data['API_PUBLIC_URL'] || ''
      });
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/config/batch', config);
      await api.get('/admin/config/reload');
      alert('Configurações de ambiente (ENV) salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar', error);
      alert('Erro ao salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const fields = [
    {
      name: 'API_PUBLIC_URL',
      label: 'API_PUBLIC_URL',
      hint: 'URL externa desta API, ex: http://192.168.2.42:4100',
      placeholder: 'http://192.168.2.42:4100',
    },
    {
      name: 'N8N_BASE_URL',
      label: 'N8N_BASE_URL',
      hint: 'URL do seu servidor n8n',
      placeholder: 'http://localhost:5678',
    },
    {
      name: 'N8N_FILES_WORKFLOW_UPLOAD_URL',
      label: 'N8N_FILES_WORKFLOW_UPLOAD_URL',
      hint: '',
      placeholder: 'http://localhost:5678/webhook/nexus-file-upload',
    },
    {
      name: 'N8N_WEBHOOK_STATUS_URL',
      label: 'N8N_WEBHOOK_STATUS_URL',
      hint: 'Callback de retorno',
      placeholder: 'http://192.168.2.42:4100/api/webhooks/n8n/status',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground mb-1">
          Variáveis de Ambiente (APIs)
        </h1>
        <p className="text-sm text-muted-foreground">
          Altere as configurações de integração. Elas substituirão os valores do arquivo .env.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card max-w-2xl"
      >
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
          <Settings className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <h2 className="text-sm font-medium text-foreground">Configuração n8n & Dropbox</h2>
        </div>

        {loading ? (
          <div className="p-4 text-muted-foreground">Carregando...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="font-mono-data text-xs">{field.label}</span>
                  {field.hint && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({field.hint})
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name={field.name}
                  value={config[field.name as keyof typeof config]}
                  onChange={handleChange}
                  className="input font-mono-data text-xs"
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="btn-primary flex items-center gap-2"
                disabled={saving}
              >
                <Save className="h-4 w-4" strokeWidth={1.5} />
                {saving ? 'Salvando...' : 'Salvar Variáveis'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
