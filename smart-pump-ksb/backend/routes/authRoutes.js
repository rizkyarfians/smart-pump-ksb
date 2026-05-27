const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { pool } = require('../config/db');

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role_id: user.role_id,
      username: user.username,
    },
    process.env.JWT_SECRET || 'dev_secret_change_this',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    }
  );
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: false, // ubah true kalau nanti pakai HTTPS
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi',
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        role_id,
        name,
        username,
        password_hash,
        is_active
      FROM users
      WHERE username = ?
      LIMIT 1
      `,
      [username]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah',
      });
    }

    if (Number(user.is_active) !== 1) {
      return res.status(403).json({
        success: false,
        message: 'User tidak aktif',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah',
      });
    }

    const token = createToken(user);

    res.cookie('auth_token', token, getCookieOptions());

    return res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: {
          id: user.id,
          role_id: user.role_id,
          name: user.name,
          username: user.username,
        },
      },
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Login gagal',
      error: error.message,
    });
  }
});

router.get('/me', async (req, res) => {
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

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          role_id: user.role_id,
          name: user.name,
          username: user.username,
        },
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session tidak valid',
    });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', getCookieOptions());

  return res.json({
    success: true,
    message: 'Logout berhasil',
  });
});

module.exports = router;