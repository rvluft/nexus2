import { useEffect, useState } from 'react';
import { api, User } from '../../lib/api';
import { motion } from 'framer-motion';
import { UserPlus, Edit3, UserX, X } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role_id: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setFormData({ email: '', name: '', password: '', role_id: '' });
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role_id: user.role?.id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...formData };
      if (!payload.role_id) delete payload.role_id;
      if (!payload.password) delete payload.password;
      if (editUser) {
        await api.patch(`/users/${editUser.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setShowModal(false);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Desativar usuário?')) return;
    try {
      await api.delete(`/users/${userId}`);
      loadUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao deletar');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-foreground">Usuários</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <UserPlus className="h-4 w-4" strokeWidth={1.5} />
          Novo Usuário
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card overflow-hidden p-0"
      >
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <table className="table">
            <thead>
              <tr className="border-b border-border/60">
                <th className="table-th">Nome</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="table-td font-medium">{user.name}</td>
                  <td className="table-td text-muted-foreground">{user.email}</td>
                  <td className="table-td">
                    <span
                      className="px-2 py-1 rounded-inner text-xs font-medium"
                      style={{
                        background: 'hsl(217 70% 55% / 0.15)',
                        color: 'hsl(217 70% 65%)',
                      }}
                    >
                      {user.role?.name || 'viewer'}
                    </span>
                  </td>
                  <td className="table-td">
                    {user.is_active ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        <span className="text-success">Ativo</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        <span className="text-destructive">Inativo</span>
                      </span>
                    )}
                  </td>
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 hover:bg-secondary rounded-inner transition-colors text-muted-foreground hover:text-primary"
                        title="Editar"
                      >
                        <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded-inner transition-colors text-muted-foreground hover:text-destructive"
                        title="Desativar"
                      >
                        <UserX className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-md"
            style={{
              background: 'linear-gradient(145deg, hsl(240 10% 6%) 0%, hsl(230 15% 9%) 100%)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-foreground">
                {editUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Senha {editUser && <span className="text-muted-foreground font-normal">(deixe vazia para manter)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  required={!editUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="550e8400-e29b-41d4-a716-446655440001">Admin</option>
                  <option value="550e8400-e29b-41d4-a716-446655440002">Manager</option>
                  <option value="550e8400-e29b-41d4-a716-446655440003">Viewer</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editUser ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
