require('dotenv').config();

process.on('uncaughtException', (error) => {
  console.error('[PROCESS] Uncaught exception:', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[PROCESS] Unhandled rejection:', reason);
});

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { testConnection, pool } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const pumpRoutes = require('./routes/pumpRoutes');
const modbusRoutes = require('./routes/modbusRoutes');
const dbRoutes = require('./routes/dbRoutes');
const cameraRoutes = require('./routes/cameraRoutes');
const alarmRoutes = require('./routes/alarmRoutes');
const adminUsersRoutes = require('./routes/adminUsersRoutes');


// const cameraRoutes = require('./routes/cameraRoutes');

const { startModbusPolling } = require('./services/modbusService');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/db', dbRoutes);
app.use('/api/modbus', modbusRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/camera', cameraRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/alarms', alarmRoutes);

app.get('/', (req, res) => {
  res.json({
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  await testConnection();

  console.log(`Server running on port ${PORT}`);

  startModbusPolling();
});