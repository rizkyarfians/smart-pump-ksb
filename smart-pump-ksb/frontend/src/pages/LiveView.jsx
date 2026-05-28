import { useCallback, useEffect, useRef, useState } from 'react';
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
  const snapshotUrl = `${API_BASE_URL}/camera/${camera.id}/snapshot`;
  const calibrationStorageKey = `water_level_calibration_camera_${camera.id}`;

  const imageRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const processingCanvasRef = useRef(null);
  const lastSentLevelRef = useRef(null);

  const [selectMode, setSelectMode] = useState(null);
  const [topPoint, setTopPoint] = useState(null);
  const [bottomPoint, setBottomPoint] = useState(null);
  const [waterLevel, setWaterLevel] = useState(0);
  const [waterLineY, setWaterLineY] = useState(null);
  const [sendStatus, setSendStatus] = useState('Idle');

  const getCanvasSize = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const image = imageRef.current;

    const rect =
      canvas?.getBoundingClientRect() ||
      image?.getBoundingClientRect();

    return {
      width: rect?.width || 0,
      height: rect?.height || 0,
    };
  }, []);

  const saveCalibration = useCallback(
    (nextTopPoint, nextBottomPoint) => {
      const { width, height } = getCanvasSize();

      if (width <= 0 || height <= 0) return;

      const payload = {
        topPoint: nextTopPoint
          ? {
              xRatio: nextTopPoint.x / width,
              yRatio: nextTopPoint.y / height,
            }
          : null,
        bottomPoint: nextBottomPoint
          ? {
              xRatio: nextBottomPoint.x / width,
              yRatio: nextBottomPoint.y / height,
            }
          : null,
      };

      localStorage.setItem(
        calibrationStorageKey,
        JSON.stringify(payload),
      );
    },
    [calibrationStorageKey, getCanvasSize],
  );

  const loadCalibration = useCallback(() => {
    const saved = localStorage.getItem(calibrationStorageKey);

    if (!saved) return;

    const { width, height } = getCanvasSize();

    if (width <= 0 || height <= 0) return;

    try {
      const parsed = JSON.parse(saved);

      if (parsed.topPoint) {
        setTopPoint({
          x: parsed.topPoint.xRatio * width,
          y: parsed.topPoint.yRatio * height,
        });
      }

      if (parsed.bottomPoint) {
        setBottomPoint({
          x: parsed.bottomPoint.xRatio * width,
          y: parsed.bottomPoint.yRatio * height,
        });
      }
    } catch (err) {
      console.log('Failed to load water level calibration:', err);
    }
  }, [calibrationStorageKey, getCanvasSize]);

  const sendWaterLevelToPLC = useCallback(async (level) => {
    try {
      setSendStatus('Sending...');

      const res = await API.post('/modbus/water-level', {
        level,
      });

      if (res.data?.success) {
        setSendStatus(`Sent to PLC: ${level.toFixed(1)}%`);
      } else {
        setSendStatus(res.data?.message || 'Failed send to PLC');
      }
    } catch (err) {
      console.log('Failed send water level:', err);

      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Unknown error';

      setSendStatus(`Failed: ${errorMessage}`);
    }
  }, []);

  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) return;

    const rect = image.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 3;
    ctx.font = '14px Arial';

    if (topPoint) {
      ctx.strokeStyle = '#22c55e';
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(topPoint.x, topPoint.y, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText('TOP 100%', topPoint.x + 10, topPoint.y - 8);
    }

    if (bottomPoint) {
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(bottomPoint.x, bottomPoint.y, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText('BOTTOM 0%', bottomPoint.x + 10, bottomPoint.y + 18);
    }

    if (topPoint && bottomPoint) {
      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(topPoint.x, topPoint.y);
      ctx.lineTo(bottomPoint.x, bottomPoint.y);
      ctx.stroke();
    }

    if (waterLineY !== null) {
      ctx.strokeStyle = '#06b6d4';
      ctx.fillStyle = '#06b6d4';

      ctx.beginPath();
      ctx.moveTo(0, waterLineY);
      ctx.lineTo(canvas.width, waterLineY);
      ctx.stroke();

      ctx.fillText(
        `Water Level ${waterLevel.toFixed(1)}%`,
        16,
        Math.max(22, waterLineY - 10),
      );
    }
  }, [topPoint, bottomPoint, waterLineY, waterLevel]);

  const detectWaterLevel = useCallback(async () => {
    if (!topPoint || !bottomPoint) return;

    const image = imageRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const processingCanvas = processingCanvasRef.current;

    if (!image || !overlayCanvas || !processingCanvas) return;

    const displayRect = image.getBoundingClientRect();
    const width = Math.round(displayRect.width);
    const height = Math.round(displayRect.height);

    if (width <= 0 || height <= 0) return;

    try {
      const response = await fetch(`${snapshotUrl}?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Snapshot failed');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const snapshotImage = new Image();

      snapshotImage.onload = () => {
        const ctx = processingCanvas.getContext('2d');

        processingCanvas.width = width;
        processingCanvas.height = height;

        ctx.drawImage(snapshotImage, 0, 0, width, height);

        const xCenter = Math.round((topPoint.x + bottomPoint.x) / 2);
        const yTop = Math.round(Math.min(topPoint.y, bottomPoint.y));
        const yBottom = Math.round(Math.max(topPoint.y, bottomPoint.y));

        const scanWidth = 70;

        let bestY = yBottom;
        let bestScore = 0;

        for (let y = yTop + 3; y < yBottom - 3; y += 1) {
          let score = 0;

          for (let dx = -scanWidth / 2; dx <= scanWidth / 2; dx += 2) {
            const x = Math.round(xCenter + dx);

            if (x < 0 || x >= width) continue;

            const above = ctx.getImageData(x, y - 3, 1, 1).data;
            const below = ctx.getImageData(x, y + 3, 1, 1).data;

            const grayAbove =
              above[0] * 0.299 +
              above[1] * 0.587 +
              above[2] * 0.114;

            const grayBelow =
              below[0] * 0.299 +
              below[1] * 0.587 +
              below[2] * 0.114;

            score += Math.abs(grayAbove - grayBelow);
          }

          if (score > bestScore) {
            bestScore = score;
            bestY = y;
          }
        }

        const level = ((yBottom - bestY) / (yBottom - yTop)) * 100;
        const clampedLevel = Math.max(0, Math.min(100, level));

        setWaterLineY(bestY);
        setWaterLevel(clampedLevel);

        const lastSent = lastSentLevelRef.current;
        const diff =
          lastSent === null ? 999 : Math.abs(clampedLevel - lastSent);

        if (diff >= 0.5) {
          sendWaterLevelToPLC(clampedLevel);
          lastSentLevelRef.current = clampedLevel;
        }

        URL.revokeObjectURL(objectUrl);
      };

      snapshotImage.onerror = () => {
        URL.revokeObjectURL(objectUrl);
      };

      snapshotImage.src = objectUrl;
    } catch (err) {
      console.log('Water level detection failed:', err);
    }
  }, [topPoint, bottomPoint, snapshotUrl, sendWaterLevelToPLC]);

  const handleOverlayClick = useCallback(
    (e) => {
      if (!selectMode) return;

      const canvas = overlayCanvasRef.current;

      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (selectMode === 'top') {
        setTopPoint(point);
        saveCalibration(point, bottomPoint);
      }

      if (selectMode === 'bottom') {
        setBottomPoint(point);
        saveCalibration(topPoint, point);
      }

      setSelectMode(null);
    },
    [selectMode, topPoint, bottomPoint, saveCalibration],
  );

  const handleResetWaterLevel = useCallback(() => {
    setTopPoint(null);
    setBottomPoint(null);
    setWaterLineY(null);
    setWaterLevel(0);
    setSelectMode(null);
    setSendStatus('Idle');
    lastSentLevelRef.current = null;

    localStorage.removeItem(calibrationStorageKey);
  }, [calibrationStorageKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCalibration();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadCalibration, streamKey]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  useEffect(() => {
    if (!topPoint || !bottomPoint) return undefined;

    const interval = setInterval(() => {
      detectWaterLevel();
    }, 1000);

    return () => clearInterval(interval);
  }, [topPoint, bottomPoint, detectWaterLevel]);

  useEffect(() => {
    const handleResize = () => {
      loadCalibration();
      drawOverlay();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [loadCalibration, drawOverlay]);

  return (
    <div className="relative h-[calc(100vh-190px)] min-h-[360px] overflow-hidden rounded-2xl bg-slate-950">
      {!hasError ? (
        <>
          <img
            ref={imageRef}
            key={streamKey}
            src={streamUrl}
            alt={camera.camera_name}
            className="h-full w-full object-fill"
            onError={onError}
            onLoad={() => {
              loadCalibration();
              drawOverlay();
            }}
          />

          <canvas
            ref={overlayCanvasRef}
            onClick={handleOverlayClick}
            className="absolute inset-0 z-10 h-full w-full cursor-crosshair"
          />

          <canvas ref={processingCanvasRef} className="hidden" />
        </>
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

      <div className="absolute left-5 top-5 z-20 rounded-2xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
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
        className="absolute right-5 top-5 z-20 rounded-xl bg-white/90 px-4 py-2 text-xs font-black text-slate-950 shadow-sm backdrop-blur transition hover:bg-white"
      >
        Reload
      </button>

      <div className="absolute bottom-5 left-5 right-5 z-20 rounded-2xl bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Water Level Camera
            </div>

            <div className="mt-1 text-3xl font-black text-slate-950">
              {waterLevel.toFixed(1)}%
            </div>

            <div className="mt-1 text-xs font-bold text-slate-500">
              PLC Register: %MW160 · {sendStatus}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectMode('top')}
              className={`rounded-xl px-4 py-2 text-xs font-black text-white ${
                selectMode === 'top' ? 'bg-green-700' : 'bg-green-600'
              }`}
            >
              Set Top
            </button>

            <button
              type="button"
              onClick={() => setSelectMode('bottom')}
              className={`rounded-xl px-4 py-2 text-xs font-black text-white ${
                selectMode === 'bottom' ? 'bg-red-700' : 'bg-red-600'
              }`}
            >
              Set Bottom
            </button>

            <button
              type="button"
              onClick={handleResetWaterLevel}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
            >
              Reset
            </button>
          </div>
        </div>

        {selectMode && (
          <div className="mt-3 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
            Klik pada gambar kamera untuk memilih titik{' '}
            {selectMode === 'top' ? 'atas / 100%' : 'bawah / 0%'}.
          </div>
        )}
      </div>
    </div>
  );
}