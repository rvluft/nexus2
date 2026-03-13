import { useEffect, useState } from 'react';
import { api, User } from '../../lib/api';

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
      role_id: user.role_id,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editUser) {
        await api.patch(`/users/${editUser.id}`, formData);
      } else {
        await api.post('/users', formData);
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
        <h1 className="text-2xl font-bold text-secondary">Usuários</h1>
        <button onClick={openCreate} className="btn-primary">
          + Novo Usuário
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center">Carregando...</div>
        ) : (
          <table className="table">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="table-th">Nome</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{user.name}</td>
                  <td className="table-td">{user.email}</td>
                  <td className="table-td">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {user.role?.name || 'viewer'}
                    </span>
                  </td>
                  <td className="table-td">
                    {user.is_active ? (
                      <span className="text-green-600 text-sm">Ativo</span>
                    ) : (
                      <span className="text-red-600 text-sm">Inativo</span>
                    )}
                  </td>
                  <td className="table-td text-right space-x-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-primary text-sm hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Desativar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Senha {editUser && '(deixe vazia para manter)'}
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
                <label className="block text-sm font-medium mb-1">Role</label>
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
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  {editUser ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
