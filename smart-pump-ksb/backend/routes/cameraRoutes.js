const express = require('express');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const jwt = require('jsonwebtoken');

const { pool } = require('../config/db');

const router = express.Router();

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev_secret_change_this'
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        role_id,
        name,
        username,
        is_active
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [decoded.id]
    );

    const user = rows[0];

    if (!user || Number(user.is_active) !== 1) {
      return res.status(401).json({
        success: false,
        message: 'User tidak valid',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session tidak valid',
    });
  }
}

function requireAdmin(req, res, next) {
  if (Number(req.user?.role_id) !== 1) {
    return res.status(403).json({
      success: false,
      message: 'Akses hanya untuk administrator',
    });
  }

  next();
}

function normalizeStreamPath(streamPath) {
  const path = streamPath || '/stream1';

  if (path.startsWith('/')) {
    return path;
  }

  return `/${path}`;
}

function buildRtspUrl(camera) {
  const host = camera.host;
  const port = Number(camera.port) || 554;
  const streamPath = normalizeStreamPath(camera.stream_path);

  const username = camera.username || '';
  const password = camera.password || '';

  let authPart = '';

  if (username && password) {
    authPart = `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  } else if (username) {
    authPart = `${encodeURIComponent(username)}@`;
  }

  return `rtsp://${authPart}${host}:${port}${streamPath}`;
}

function sanitizeCamera(camera) {
  return {
    id: camera.id,
    camera_name: camera.camera_name,
    host: camera.host,
    port: camera.port,
    username: camera.username,
    stream_path: camera.stream_path,
    is_main: camera.is_main,
    is_active: camera.is_active,
    created_at: camera.created_at,
    updated_at: camera.updated_at,
  };
}

async function getMainCamera() {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM camera_settings
    WHERE is_active = 1
    ORDER BY is_main DESC, id ASC
    LIMIT 1
    `
  );

  return rows[0] || null;
}

async function getActiveCameras() {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM camera_settings
    WHERE is_active = 1
    ORDER BY is_main DESC, id ASC
    `
  );

  return rows;
}

async function getCameraById(id) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM camera_settings
    WHERE id = ?
      AND is_active = 1
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

function streamCameraToResponse(camera, req, res) {
  const rtspUrl = buildRtspUrl(camera);

  if (!ffmpegPath) {
    return res.status(500).json({
      success: false,
      message: 'FFmpeg binary not found. Please install ffmpeg-static.',
    });
  }

  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=ffmpeg',
    'Cache-Control': 'no-cache',
    Connection: 'close',
    Pragma: 'no-cache',
  });

  const ffmpeg = spawn(ffmpegPath, [
    '-rtsp_transport',
    'tcp',
    '-i',
    rtspUrl,

    '-an',
    '-vf',
    'fps=5,scale=854:-1',

    '-f',
    'mpjpeg',
    '-q:v',
    '8',

    'pipe:1',
  ]);

  ffmpeg.stdout.on('data', (chunk) => {
    res.write(chunk);
  });

  ffmpeg.stderr.on('data', () => {
    // Uncomment kalau mau debug FFmpeg:
    // console.log('[CAMERA FFMPEG]', data.toString());
  });

  ffmpeg.on('error', (error) => {
    console.error('[CAMERA] FFmpeg spawn error:', error.message);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to start FFmpeg',
        error: error.message,
      });
    }

    if (!res.writableEnded) {
      res.end();
    }
  });

  ffmpeg.on('close', (code) => {
    console.log(`[CAMERA] FFmpeg closed for camera ${camera.id}:`, code);

    if (!res.writableEnded) {
      res.end();
    }
  });

  req.on('close', () => {
    console.log(`[CAMERA] Client disconnected from camera ${camera.id}`);

    if (!ffmpeg.killed) {
      ffmpeg.kill('SIGTERM');
    }
  });
}

/**
 * GET /api/camera/mjpeg
 * Stream kamera default / kamera utama.
 * Ini tetap dipertahankan supaya komponen lama yang pakai /api/camera/mjpeg tetap jalan.
 */
router.get('/mjpeg', requireAuth, async (req, res) => {
  try {
    const camera = await getMainCamera();

    if (!camera) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada kamera aktif. Tambahkan kamera di Camera Settings.',
      });
    }

    return streamCameraToResponse(camera, req, res);
  } catch (error) {
    console.error('[CAMERA] Main stream error:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Camera stream error',
        error: error.message,
      });
    }

    res.end();
  }
});

/**
 * GET /api/camera/active
 * Ambil semua kamera aktif untuk ditampilkan di Live View.
 */
router.get('/active', requireAuth, async (req, res) => {
  try {
    const cameras = await getActiveCameras();

    return res.json({
      success: true,
      data: cameras.map(sanitizeCamera),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil kamera aktif',
      error: error.message,
    });
  }
});

/**
 * GET /api/camera/main
 * Ambil kamera default / kamera utama tanpa menampilkan password.
 */
router.get('/main', requireAuth, async (req, res) => {
  try {
    const camera = await getMainCamera();

    if (!camera) {
      return res.status(404).json({
        success: false,
        message: 'Tidak ada kamera aktif',
      });
    }

    return res.json({
      success: true,
      data: sanitizeCamera(camera),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil kamera utama',
      error: error.message,
    });
  }
});

/**
 * GET /api/camera/settings
 * Admin: ambil semua setting kamera.
 */
router.get('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        camera_name,
        host,
        port,
        username,
        stream_path,
        is_main,
        is_active,
        created_at,
        updated_at
      FROM camera_settings
      ORDER BY is_main DESC, id ASC
      `
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kamera',
      error: error.message,
    });
  }
});

/**
 * POST /api/camera/settings
 * Admin: tambah kamera.
 */
router.post('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      camera_name,
      host,
      port,
      username,
      password,
      stream_path,
      is_main,
      is_active,
    } = req.body;

    if (!camera_name || !host) {
      return res.status(400).json({
        success: false,
        message: 'Nama kamera dan IP/host wajib diisi',
      });
    }

    if (Number(is_main) === 1) {
      await pool.query(`
        UPDATE camera_settings
        SET is_main = 0
      `);
    }

    const [result] = await pool.query(
      `
      INSERT INTO camera_settings (
        camera_name,
        host,
        port,
        username,
        password,
        stream_path,
        is_main,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        camera_name,
        host,
        Number(port) || 554,
        username || null,
        password || null,
        normalizeStreamPath(stream_path || '/stream1'),
        Number(is_main) === 1 ? 1 : 0,
        Number(is_active) === 0 ? 0 : 1,
      ]
    );

    return res.json({
      success: true,
      message: 'Kamera berhasil ditambahkan',
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan kamera',
      error: error.message,
    });
  }
});

/**
 * PUT /api/camera/settings/:id
 * Admin: update kamera.
 */
router.put('/settings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      camera_name,
      host,
      port,
      username,
      password,
      stream_path,
      is_main,
      is_active,
    } = req.body;

    if (!camera_name || !host) {
      return res.status(400).json({
        success: false,
        message: 'Nama kamera dan IP/host wajib diisi',
      });
    }

    if (Number(is_main) === 1) {
      await pool.query(`
        UPDATE camera_settings
        SET is_main = 0
      `);
    }

    if (password && password.trim() !== '') {
      await pool.query(
        `
        UPDATE camera_settings
        SET
          camera_name = ?,
          host = ?,
          port = ?,
          username = ?,
          password = ?,
          stream_path = ?,
          is_main = ?,
          is_active = ?
        WHERE id = ?
        `,
        [
          camera_name,
          host,
          Number(port) || 554,
          username || null,
          password,
          normalizeStreamPath(stream_path || '/stream1'),
          Number(is_main) === 1 ? 1 : 0,
          Number(is_active) === 0 ? 0 : 1,
          id,
        ]
      );
    } else {
      await pool.query(
        `
        UPDATE camera_settings
        SET
          camera_name = ?,
          host = ?,
          port = ?,
          username = ?,
          stream_path = ?,
          is_main = ?,
          is_active = ?
        WHERE id = ?
        `,
        [
          camera_name,
          host,
          Number(port) || 554,
          username || null,
          normalizeStreamPath(stream_path || '/stream1'),
          Number(is_main) === 1 ? 1 : 0,
          Number(is_active) === 0 ? 0 : 1,
          id,
        ]
      );
    }

    return res.json({
      success: true,
      message: 'Kamera berhasil diupdate',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengupdate kamera',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/camera/settings/:id/main
 * Admin: jadikan kamera default / urutan utama.
 */
router.patch('/settings/:id/main', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`
      UPDATE camera_settings
      SET is_main = 0
    `);

    await pool.query(
      `
      UPDATE camera_settings
      SET is_main = 1, is_active = 1
      WHERE id = ?
      `,
      [id]
    );

    return res.json({
      success: true,
      message: 'Kamera default berhasil diubah',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah kamera default',
      error: error.message,
    });
  }
});

/**
 * PATCH /api/camera/settings/:id/status
 * Admin: aktif/nonaktif kamera.
 */
router.patch('/settings/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await pool.query(
      `
      UPDATE camera_settings
      SET is_active = ?
      WHERE id = ?
      `,
      [Number(is_active) === 1 ? 1 : 0, id]
    );

    return res.json({
      success: true,
      message: 'Status kamera berhasil diubah',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah status kamera',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/camera/settings/:id
 * Admin: hapus kamera.
 */
router.delete('/settings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT is_main
      FROM camera_settings
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    const camera = rows[0];

    if (!camera) {
      return res.status(404).json({
        success: false,
        message: 'Kamera tidak ditemukan',
      });
    }

    if (Number(camera.is_main) === 1) {
      return res.status(400).json({
        success: false,
        message: 'Kamera default tidak bisa dihapus. Pilih kamera default lain terlebih dahulu.',
      });
    }

    await pool.query(
      `
      DELETE FROM camera_settings
      WHERE id = ?
      `,
      [id]
    );

    return res.json({
      success: true,
      message: 'Kamera berhasil dihapus',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus kamera',
      error: error.message,
    });
  }
});

/**
 * GET /api/camera/:id/mjpeg
 * Stream kamera berdasarkan ID.
 * Route ini harus diletakkan setelah route static seperti /settings, /active, /main.
 */
router.get('/:id/mjpeg', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const camera = await getCameraById(id);

    if (!camera) {
      return res.status(404).json({
        success: false,
        message: 'Kamera tidak ditemukan atau tidak aktif',
      });
    }

    return streamCameraToResponse(camera, req, res);
  } catch (error) {
    console.error('[CAMERA] Stream error:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Camera stream error',
        error: error.message,
      });
    }

    res.end();
  }
});

module.exports = router;