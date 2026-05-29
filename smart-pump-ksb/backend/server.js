require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

process.on('uncaughtException', (error) => {
  console.error('[PROCESS] Uncaught exception:', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[PROCESS] Unhandled rejection:', reason);
});

const { testConnection, pool } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const pumpRoutes = require('./routes/pumpRoutes');
const modbusRoutes = require('./routes/modbusRoutes');
const dbRoutes = require('./routes/dbRoutes');
const cameraRoutes = require('./routes/cameraRoutes');
const alarmRoutes = require('./routes/alarmRoutes');
const adminUsersRoutes = require('./routes/adminUsersRoutes');

const { startModbusPolling } = require('./services/modbusService');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

/**
 * API ROUTES
 */
app.use('/api/auth', authRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/modbus', modbusRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/camera', cameraRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/alarms', alarmRoutes);

/**
 * Backend health check
 * Sebelumnya app.get('/') dipakai JSON.
 * Sekarang dipindah ke /api/health supaya '/' bisa dipakai React.
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Pump Backend is running',
  });
});

app.get('/api/test/db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS server_time');

    res.json({
      success: true,
      message: 'Database connection OK',
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

/**
 * FRONTEND PRODUCTION BUILD
 * Pastikan frontend sudah di-build:
 * cd frontend
 * npm run build
 *
 * Folder yang dibaca:
 * frontend/dist
 */
const frontendDistPath = path.join(__dirname, '../frontend/dist');

app.use(express.static(frontendDistPath));

/**
 * React Router fallback
 * Contoh:
 * /live-view
 * /settings/modbus
 * /data-logging
 *
 * Semua route non-/api diarahkan ke index.html
 */
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'API route not found',
    });
  }

  return res.sendFile(path.join(frontendDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  await testConnection();

  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);

  startModbusPolling();
});