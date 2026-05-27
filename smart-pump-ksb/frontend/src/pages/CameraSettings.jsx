import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import API from '../services/api';
import { getCurrentUser } from '../services/auth';

const emptyForm = {
  camera_name: '',
  host: '',
  port: 554,
  username: '',
  password: '',
  stream_path: '/stream1',
  is_main: 0,
  is_active: 1,
};

export default function CameraSettings() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const isAdmin = Number(currentUser?.role_id) === 1;

  const [cameras, setCameras] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCamera, setEditingCamera] = useState(null);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isAdmin);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    if (!isAdmin) return;

    let active = true;

    async function loadCameras() {
      try {
        const res = await API.get('/camera/settings');

        if (active && res.data?.success) {
          setCameras(res.data.data || []);
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setMessage(error.response?.data?.message || 'Gagal mengambil data kamera');
          setMessageType('error');
        }
      } finally {
        if (active) {
          setPageLoading(false);
        }
      }
    }

    loadCameras();

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchCameras = async () => {
    try {
      setPageLoading(true);

      const res = await API.get('/camera/settings');

      if (res.data?.success) {
        setCameras(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || 'Gagal mengambil data kamera',
        'error'
      );
    } finally {
      setPageLoading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCamera(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = (camera) => {
    setEditingCamera(camera);

    setForm({
      camera_name: camera.camera_name || '',
      host: camera.host || '',
      port: Number(camera.port) || 554,
      username: camera.username || '',
      password: '',
      stream_path: camera.stream_path || '/stream1',
      is_main: Number(camera.is_main) === 1 ? 1 : 0,
      is_active: Number(camera.is_active) === 1 ? 1 : 0,
    });

    showMessage(`Sedang edit kamera: ${camera.camera_name}`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.camera_name.trim()) {
      showMessage('Nama kamera wajib diisi', 'error');
      return;
    }

    if (!form.host.trim()) {
      showMessage('IP/Host kamera wajib diisi', 'error');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        camera_name: form.camera_name.trim(),
        host: form.host.trim(),
        port: Number(form.port) || 554,
        username: form.username.trim() || null,
        stream_path: form.stream_path.trim() || '/stream1',
        is_main: Number(form.is_main),
        is_active: Number(form.is_active),
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (editingCamera) {
        const res = await API.put(`/camera/settings/${editingCamera.id}`, payload);

        if (res.data?.success) {
          showMessage('Kamera berhasil diupdate', 'success');
          resetForm();
          await fetchCameras();
        }
      } else {
        const res = await API.post('/camera/settings', payload);

        if (res.data?.success) {
          showMessage('Kamera berhasil ditambahkan', 'success');
          resetForm();
          await fetchCameras();
        }
      }
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || 'Gagal menyimpan kamera',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSetMain = async (camera) => {
    const confirmed = window.confirm(
      `Jadikan "${camera.camera_name}" sebagai kamera utama?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await API.patch(`/camera/settings/${camera.id}/main`);

      if (res.data?.success) {
        showMessage('Kamera utama berhasil diubah', 'success');
        await fetchCameras();
      }
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || 'Gagal mengubah kamera utama',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (camera) => {
    const nextStatus = Number(camera.is_active) === 1 ? 0 : 1;

    const confirmed = window.confirm(
      nextStatus === 1
        ? `Aktifkan kamera "${camera.camera_name}"?`
        : `Nonaktifkan kamera "${camera.camera_name}"?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await API.patch(`/camera/settings/${camera.id}/status`, {
        is_active: nextStatus,
      });

      if (res.data?.success) {
        showMessage('Status kamera berhasil diubah', 'success');
        await fetchCameras();
      }
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || 'Gagal mengubah status kamera',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (camera) => {
    const confirmed = window.confirm(
      `Yakin ingin menghapus kamera "${camera.camera_name}"?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      const res = await API.delete(`/camera/settings/${camera.id}`);

      if (res.data?.success) {
        showMessage('Kamera berhasil dihapus', 'success');
        await fetchCameras();
      }
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || 'Gagal menghapus kamera',
        'error'
      );
    } finally {
      setLoading(false);
    }
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
            Camera Settings
          </h1>

          <p className="text-sm text-slate-500">
            Tambah kamera, ubah IP RTSP, dan pilih kamera utama untuk Live View.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCameras}
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {editingCamera ? 'Edit Kamera' : 'Tambah Kamera'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Nama Kamera
              </label>

              <input
                type="text"
                name="camera_name"
                value={form.camera_name}
                onChange={handleChange}
                placeholder="Contoh: Main Camera"
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                IP / Host Kamera
              </label>

              <input
                type="text"
                name="host"
                value={form.host}
                onChange={handleChange}
                placeholder="Contoh: 192.168.1.124"
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Port RTSP
              </label>

              <input
                type="number"
                name="port"
                value={form.port}
                onChange={handleChange}
                placeholder="554"
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
                placeholder="Contoh: admin"
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Password Kamera
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={
                  editingCamera
                    ? 'Kosongkan jika tidak diubah'
                    : 'Masukkan password kamera'
                }
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              />

              {editingCamera && (
                <p className="mt-1 text-xs text-slate-500">
                  Kosongkan password jika tidak ingin mengganti password kamera.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Stream Path
              </label>

              <input
                type="text"
                name="stream_path"
                value={form.stream_path}
                onChange={handleChange}
                placeholder="/stream1"
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              />

              <p className="mt-1 text-xs text-slate-500">
                Contoh umum: /stream1, /Streaming/Channels/101, /h264Preview_01_main
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Kamera Utama
              </label>

              <select
                name="is_main"
                value={form.is_main}
                onChange={handleChange}
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-800"
              >
                <option value={0}>Tidak</option>
                <option value={1}>Ya</option>
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

            <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
              Preview RTSP:{' '}
              <span className="break-all text-slate-800">
                rtsp://{form.username ? `${form.username}:******@` : ''}
                {form.host || 'IP_CAMERA'}:{form.port || 554}
                {form.stream_path?.startsWith('/')
                  ? form.stream_path
                  : `/${form.stream_path || 'stream1'}`}
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="h-10 flex-1 rounded-xl bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading
                  ? 'Menyimpan...'
                  : editingCamera
                    ? 'Update Kamera'
                    : 'Tambah Kamera'}
              </button>

              {editingCamera && (
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
              Daftar Kamera
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-bold">Nama</th>
                  <th className="px-5 py-3 font-bold">RTSP</th>
                  <th className="px-5 py-3 font-bold">Main</th>
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
                      Memuat data kamera...
                    </td>
                  </tr>
                )}

                {!pageLoading &&
                  cameras.map((camera) => (
                    <tr
                      key={camera.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {camera.camera_name}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          ID: {camera.id}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">
                          {camera.host}:{camera.port}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {camera.username ? `${camera.username}@` : ''}
                          {camera.stream_path}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            Number(camera.is_main) === 1
                              ? 'rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white'
                              : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600'
                          }
                        >
                          {Number(camera.is_main) === 1 ? 'Main' : 'Backup'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            Number(camera.is_active) === 1
                              ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700'
                              : 'rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700'
                          }
                        >
                          {Number(camera.is_active) === 1 ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(camera.updated_at)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(camera)}
                            disabled={loading}
                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetMain(camera)}
                            disabled={loading || Number(camera.is_main) === 1}
                            className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Set Main
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(camera)}
                            disabled={loading}
                            className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
                          >
                            {Number(camera.is_active) === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(camera)}
                            disabled={loading || Number(camera.is_main) === 1}
                            className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!pageLoading && cameras.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-10 text-center text-slate-500"
                    >
                      Belum ada data kamera.
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