import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para lidar com 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// Tipos básicos
export interface User {
  id: string;
  email: string;
  name: string;
  role_id: string;
  role?: {
    id: string;
    name: string;
    description?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface File {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface FileListResponse {
  data: File[];
  total: number;
  page: number;
  limit: number;
}

export interface IngestionJob {
  id: string;
  file_id: string;
  status: string;
  n8n_execution_id?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  file?: {
    id: string;
    original_name: string;
  };
}

export interface KnowledgeItem {
  id: string;
  title?: string;
  content: string;
  file_id?: string;
  chunk_order: number;
  embedding_id?: string;
  metadata: any;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  file?: {
    original_name: string;
  };
  creator?: {
    name: string;
    email: string;
  };
}

export interface Domain {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  is_active: boolean;
  file_count: number;
  created_at: string;
  updated_at?: string;
  created_by_name?: string;
  expert_name?: string;
  expert_whatsapp?: string;
  expert_fallback_message?: string;
}

export interface DomainAssignment {
  domain_id: string;
  domain_name: string;
  domain_color: string;
}

export interface RagMetric {
  id: string;
  evaluated_at: string;
  context_precision: number | null;
  context_recall: number | null;
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_relevancy: number | null;
  avg_score: number | null;
  sample_size: number | null;
  notes: string | null;
  source: string;
  created_at: string;
  created_by_name?: string;
}

export interface MetricAlert {
  id: string;
  metric_run_id: string;
  metric_name: string;
  threshold: number;
  current_value: number;
  message: string;
  resolved_at: string | null;
  created_at: string;
  resolved_by_name?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

// n8n admin trigger
export async function triggerAdminN8nFlow(payload?: any) {
  const response = await api.post('/n8n/trigger-admin-flow', payload || {});
  return response.data;
}

// Files helpers
export async function listFiles(params?: any): Promise<FileListResponse> {
  const response = await api.get('/files', { params });
  return response.data;
}

export async function deleteFile(id: string) {
  const response = await api.delete(`/files/${id}`);
  return response.data;
}

export async function getFileDownloadUrl(id: string) {
  const response = await api.get(`/files/${id}`);
  return response.data;
}
