const jwt = require('jsonwebtoken');

const { pool } = require('../config/db');


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

    req.user = {
      id: user.id,
      role_id: user.role_id,
      name: user.name,
      username: user.username,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session tidak valid',
    });
  }
}

function requireRole(allowedRoleIds = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!allowedRoleIds.includes(Number(req.user.role_id))) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};