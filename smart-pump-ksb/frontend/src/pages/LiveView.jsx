import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import API from '../services/api';
import { getCurrentUser } from '../services/auth';

const API_BASE_URL = 'http://localhost:5000/api';

export default function LiveView() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const isAdmin = Number(currentUser?.role_id) === 1;

  const [cameras, setCameras] = useState([]);
  const [cameraKeys, setCameraKeys] = useState({});
  const [cameraErrors, setCameraErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchCameras() {
      try {
        const res = await API.get('/camera/active');

        if (active && res.data?.success) {
          setCameras(res.data.data || []);
        }
      } catch (err) {
        console.log('Failed to load active cameras:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchCameras();

    return () => {
      active = false;
    };
  }, []);

  const handleReloadAllCameras = () => {
    setCameraErrors({});
    setCameraKeys((prev) => {
      const next = {};

      cameras.forEach((camera) => {
        next[camera.id] = (prev[camera.id] || 0) + 1;
      });

      return next;
    });
  };

  const handleReloadCamera = (cameraId) => {
    setCameraErrors((prev) => ({
      ...prev,
      [cameraId]: false,
    }));

    setCameraKeys((prev) => ({
      ...prev,
      [cameraId]: (prev[cameraId] || 0) + 1,
    }));
  };

  const handleCameraError = (cameraId) => {
    setCameraErrors((prev) => ({
      ...prev,
      [cameraId]: true,
    }));
  };

  const goToCameraSettings = () => {
    navigate('/settings/camera');
  };

  const gridClass =
    cameras.length <= 1
      ? 'grid-cols-1'
      : cameras.length === 2
        ? 'grid-cols-1 xl:grid-cols-2'
        : 'grid-cols-1 lg:grid-cols-2';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-4 xl:px-8">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">
            Live View
          </h1>

          <p className="text-sm font-semibold text-slate-500">
            Realtime monitoring untuk semua kamera RTSP aktif.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReloadAllCameras}
          className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800"
        >
          Reload Camera
        </button>
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="h-[calc(100vh-155px)] overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
          {loading ? (
            <div className="flex h-[calc(100vh-170px)] min-h-[520px] items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
              Memuat kamera...
            </div>
          ) : cameras.length === 0 ? (
            <div className="flex h-[calc(100vh-170px)] min-h-[520px] flex-col items-center justify-center rounded-2xl bg-slate-950 text-center">
              <div className="text-lg font-black text-white">
                Belum ada kamera aktif
              </div>

              <p className="mt-2 max-w-md text-sm font-semibold text-slate-400">
                Tambahkan kamera di Camera Settings, lalu aktifkan kamera tersebut.
              </p>

              {isAdmin && (
                <button
                  type="button"
                  onClick={goToCameraSettings}
                  className="mt-5 rounded-xl bg-white px-5 py-2 text-sm font-black text-slate-950"
                >
                  Open Camera Settings
                </button>
              )}
            </div>
          ) : (
            <div className={`grid ${gridClass} gap-4`}>
              {cameras.map((camera) => (
                <CameraStreamCard
                  key={camera.id}
                  camera={camera}
                  streamKey={cameraKeys[camera.id] || 0}
                  hasError={cameraErrors[camera.id]}
                  onError={() => handleCameraError(camera.id)}
                  onReload={() => handleReloadCamera(camera.id)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-5">
          {isAdmin && (
            <button
              type="button"
              onClick={goToCameraSettings}
              className="group rounded-2xl bg-slate-900 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Admin Menu
                  </div>

                  <h2 className="mt-2 text-xl font-black text-white">
                    Camera Settings
                  </h2>

                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-300">
                    Tambah kamera, ubah IP RTSP, username, password, stream path,
                    dan aktif/nonaktifkan kamera.
                  </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-900 transition group-hover:scale-105">
                  →
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-xs font-bold text-slate-200">
                Open Camera Configuration
              </div>
            </button>
          )}

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-400">
              Active Cameras
            </div>

            <div className="mt-2 text-4xl font-black text-slate-950">
              {cameras.length}
            </div>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Semua kamera dengan status aktif akan tampil di halaman ini.
            </p>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">
                Camera List
              </h2>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                Live
              </span>
            </div>

            <div className="space-y-3">
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="font-black text-slate-950">
                    {camera.camera_name}
                  </div>

                  <div className="mt-1 break-all text-xs font-bold text-slate-400">
                    {camera.host}:{camera.port}
                    {camera.stream_path}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {Number(camera.is_main) === 1 && (
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                        Default
                      </span>
                    )}

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                      Active
                    </span>
                  </div>
                </div>
              ))}

              {!loading && cameras.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-400">
                  No active camera found.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-400">
              RTSP Format
            </div>

            <div className="mt-2 break-all rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">
              rtsp://username:password@ip-camera:554/stream1
            </div>

            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
              Kalau kamera tidak tampil, biasanya masalah ada di IP kamera,
              username/password, atau stream path.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}

function CameraStreamCard({
  camera,
  streamKey,
  hasError,
  onError,
  onReload,
}) {
  const streamUrl = `${API_BASE_URL}/camera/${camera.id}/mjpeg?v=${streamKey}`;

  return (
    <div className="relative h-[calc(100vh-190px)] min-h-[360px] overflow-hidden rounded-2xl bg-slate-950">
      {!hasError ? (
        <img
          key={streamKey}
          src={streamUrl}
          alt={camera.camera_name}
          className="h-full w-full object-contain"
          onError={onError}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="text-lg font-black text-white">
            Camera stream unavailable
          </div>

          <p className="mt-2 max-w-md px-6 text-sm font-semibold text-slate-400">
            Kamera {camera.camera_name} tidak bisa diakses. Cek IP, username,
            password, stream path, dan koneksi jaringan.
          </p>

          <button
            type="button"
            onClick={onReload}
            className="mt-5 rounded-xl bg-white px-5 py-2 text-sm font-black text-slate-950"
          >
            Retry
          </button>
        </div>
      )}

      <div className="absolute left-5 top-5 rounded-2xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
        <div className="text-sm font-black text-slate-950">
          {camera.camera_name}
        </div>

        <div className="mt-1 text-xs font-bold text-slate-500">
          {camera.host}:{camera.port}
          {camera.stream_path}
        </div>
      </div>

      <button
        type="button"
        onClick={onReload}
        className="absolute right-5 top-5 rounded-xl bg-white/90 px-4 py-2 text-xs font-black text-slate-950 shadow-sm backdrop-blur transition hover:bg-white"
      >
        Reload
      </button>
    </div>
  );
}