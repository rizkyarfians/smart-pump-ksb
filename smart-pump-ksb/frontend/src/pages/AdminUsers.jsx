import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import API from '../services/api';
import { getCurrentUser } from '../services/auth';

const emptyForm = {
  name: '',
  username: '',
  password: '',
  role_id: 2,
  is_active: 1,
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const isAdmin = Number(currentUser?.role_id) === 1;

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isAdmin);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    if (!isAdmin) return;

    let active = true;

    async function loadUsers() {
      try {
        const res = await API.get('/admin/users');

        if (active && res.data?.success) {
          setUsers(res.data.data || []);
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setMessage(error.response?.data?.message || 'Gagal mengambil data user');
          setMessageType('error');
        }
      } finally {
        if (active) {
          setPageLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchUsers = async () => {
    try {
      setPageLoading(true);

      const res = await API.get('/admin/users');

      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || 'Gagal mengambil data user',
        'error'
      );
    } finally {
      setPageLoading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingUser(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = (user) => {
    setEditingUser(user);

    setForm({
      name: user.name || '',
      username: user.username || '',
      password: '',
      role_id: Number(user.role_id) || 2,
      is_active: Number(user.is_active) === 1 ? 1 : 0,
    });

    showMessage(`Sedang edit user: ${user.username}`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showMessage('Nama wajib diisi', 'error');
      return;
    }

    if (!form.username.trim()) {
      showMessage('Username wajib diisi', 'error');
      return;
    }

    if (!editingUser && !form.password.trim()) {
      showMessage('Password wajib diisi untuk user baru', 'error');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: form.name.trim(),
        username: form.username.trim(),
        role_id: Number(form.role_id),
        is_active: Number(form.is_active),
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (editingUser) {
        const res = await API.put(`/admin/users/${editingUser.id}`, payload);

        if (res.data?.success) {
          showMessage('User berhasil diupdate', 'success');
          resetForm();
          await fetchUsers();
        }
      } else {
        const res = await API.post('/admin/users', payload);

        if (res.data?.success) {
          showMessage('User berhasil ditambahkan', 'success');
          resetForm();
          await fetchUsers();
        }
      }
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || 'Gagal menyimpan user',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = Number(user.is_active) === 1 ? 0 : 1;

    const confirmed = window.confirm(
      nextStatus === 1
        ? `Aktifkan user "${user.username}"?`
        : `Nonaktifkan user "${user.username}"?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await API.patch(`/admin/users/${user.id}/status`, {
        is_active: nextStatus,
      });

      if (res.data?.success) {
        showMessage('Status user berhasil diubah', 'success');
        await fetchUsers();
      }
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || 'Gagal mengubah status user',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Yakin ingin menghapus user "${user.username}"?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await API.delete(`/admin/users/${user.id}`);

      if (res.data?.success) {
        showMessage('User berhasil dihapus', 'success');
        await fetchUsers();
      }
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || 'Gagal menghapus user',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (user) => {
    if (user.role_name) return user.role_name;
    return Number(user.role_id) === 1 ? 'Admin' : 'User / Operator';
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Halaman ini hanya bisa diakses oleh administrator.
          </p>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-5 h-10 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            User Management
          </h1>

          <p className="text-sm text-slate-500">
            Kelola akun admin dan user/operator sistem.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading || pageLoading}
          className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={
            messageType === 'success'
              ? 'mb-4 rounded-xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700'
              : messageType === 'error'
                ? 'mb-4 rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700'
                : 'mb-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700'
          }
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {editingUser ? 'Edit User' : 'Tambah User'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Nama
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Contoh: Operator 1"
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Username
              </label>

              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Contoh: operator1"
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Password
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={
                  editingUser
                    ? 'Kosongkan jika tidak diubah'
                    : 'Masukkan password'
                }
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              />

              {editingUser && (
                <p className="mt-1 text-xs text-slate-500">
                  Kosongkan password jika tidak ingin mengganti password.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Role
              </label>

              <select
                name="role_id"
                value={form.role_id}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              >
                <option value={1}>Admin</option>
                <option value={2}>User / Operator</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Status
              </label>

              <select
                name="is_active"
                value={form.is_active}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              >
                <option value={1}>Aktif</option>
                <option value={0}>Nonaktif</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="h-10 flex-1 rounded-xl bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading
                  ? 'Menyimpan...'
                  : editingUser
                    ? 'Update User'
                    : 'Tambah User'}
              </button>

              {editingUser && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="h-10 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  Batal
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              Daftar User
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-bold">Nama</th>
                  <th className="px-5 py-3 font-bold">Username</th>
                  <th className="px-5 py-3 font-bold">Role</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold">Updated</th>
                  <th className="px-5 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>

              <tbody>
                {pageLoading && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Memuat data user...
                    </td>
                  </tr>
                )}

                {!pageLoading &&
                  users.map((item) => {
                    const isSelf =
                      Number(item.id) === Number(currentUser?.id);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">
                            {item.name}
                          </div>

                          {isSelf && (
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              Akun sedang login
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {item.username}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              Number(item.role_id) === 1
                                ? 'rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white'
                                : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700'
                            }
                          >
                            {getRoleLabel(item)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              Number(item.is_active) === 1
                                ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700'
                                : 'rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700'
                            }
                          >
                            {Number(item.is_active) === 1
                              ? 'Aktif'
                              : 'Nonaktif'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(item.updated_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              disabled={loading}
                              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              disabled={loading || isSelf}
                              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {Number(item.is_active) === 1
                                ? 'Nonaktifkan'
                                : 'Aktifkan'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={loading || isSelf}
                              className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!pageLoading && users.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Belum ada data user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}