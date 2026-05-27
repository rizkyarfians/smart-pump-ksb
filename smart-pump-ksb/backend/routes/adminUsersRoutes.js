const express = require('express');
const bcrypt = require('bcryptjs');
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

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.role_id,
        r.name AS role_name,
        u.name,
        u.username,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      ORDER BY u.id ASC
      `
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data user',
      error: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { role_id, name, username, password, is_active } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, username, dan password wajib diisi',
      });
    }

    const [existingRows] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE username = ?
      LIMIT 1
      `,
      [username]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username sudah digunakan',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO users (
        role_id,
        name,
        username,
        password_hash,
        is_active
      ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(role_id) || 2,
        name,
        username,
        passwordHash,
        Number(is_active) === 0 ? 0 : 1,
      ]
    );

    return res.json({
      success: true,
      message: 'User berhasil ditambahkan',
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan user',
      error: error.message,
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id, name, username, password, is_active } = req.body;

    if (!name || !username) {
      return res.status(400).json({
        success: false,
        message: 'Nama dan username wajib diisi',
      });
    }

    const [existingRows] = await pool.query(
      `
      SELECT id
      FROM users
      WHERE username = ?
        AND id != ?
      LIMIT 1
      `,
      [username, id]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username sudah digunakan user lain',
      });
    }

    if (password && password.trim() !== '') {
      const passwordHash = await bcrypt.hash(password, 10);

      await pool.query(
        `
        UPDATE users
        SET
          role_id = ?,
          name = ?,
          username = ?,
          password_hash = ?,
          is_active = ?
        WHERE id = ?
        `,
        [
          Number(role_id) || 2,
          name,
          username,
          passwordHash,
          Number(is_active) === 0 ? 0 : 1,
          id,
        ]
      );
    } else {
      await pool.query(
        `
        UPDATE users
        SET
          role_id = ?,
          name = ?,
          username = ?,
          is_active = ?
        WHERE id = ?
        `,
        [
          Number(role_id) || 2,
          name,
          username,
          Number(is_active) === 0 ? 0 : 1,
          id,
        ]
      );
    }

    return res.json({
      success: true,
      message: 'User berhasil diupdate',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengupdate user',
      error: error.message,
    });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Admin tidak bisa menonaktifkan akun sendiri',
      });
    }

    await pool.query(
      `
      UPDATE users
      SET is_active = ?
      WHERE id = ?
      `,
      [Number(is_active) === 1 ? 1 : 0, id]
    );

    return res.json({
      success: true,
      message: 'Status user berhasil diubah',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengubah status user',
      error: error.message,
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Admin tidak bisa menghapus akun sendiri',
      });
    }

    await pool.query(
      `
      DELETE FROM users
      WHERE id = ?
      `,
      [id]
    );

    return res.json({
      success: true,
      message: 'User berhasil dihapus',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus user',
      error: error.message,
    });
  }
});

module.exports = router;