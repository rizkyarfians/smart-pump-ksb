const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');

/**
 * GET /api/db/settings
 * Untuk halaman Modbus Settings.
 * Ambil device, pumps, dan register map sekaligus.
 */
router.get('/settings', async (req, res) => {
  try {
    const [devices] = await pool.query(`
      SELECT *
      FROM modbus_devices
      ORDER BY id ASC
    `);

    const [pumps] = await pool.query(`
  SELECT
    p.*,
    md.name AS device_name,
    md.host AS device_host,
    md.port AS device_port,
    md.unit_id AS device_unit_id,

    COUNT(DISTINCT mt.id) AS register_count,
    MAX(lmv.updated_at) AS last_data,

    CASE
      WHEN MAX(lmv.updated_at) IS NOT NULL
       AND TIMESTAMPDIFF(SECOND, MAX(lmv.updated_at), NOW()) <= 10
      THEN 1
      ELSE 0
    END AS is_connected

  FROM pumps p
  JOIN modbus_devices md ON md.id = p.modbus_device_id
  LEFT JOIN modbus_tags mt ON mt.pump_id = p.id
  LEFT JOIN latest_modbus_values lmv ON lmv.tag_id = mt.id

  GROUP BY
    p.id,
    p.modbus_device_id,
    p.pump_code,
    p.pump_name,
    p.description,
    p.display_order,
    p.is_enabled,
    p.created_at,
    p.updated_at,
    md.name,
    md.host,
    md.port,
    md.unit_id

  ORDER BY p.display_order ASC
`);

    const [tags] = await pool.query(`
      SELECT
        mt.*,
        p.pump_code,
        p.pump_name,
        md.name AS device_name
      FROM modbus_tags mt
      JOIN pumps p ON p.id = mt.pump_id
      JOIN modbus_devices md ON md.id = mt.modbus_device_id
      ORDER BY p.display_order ASC, mt.tag_key ASC
    `);

    res.json({
      success: true,
      data: {
        devices,
        pumps,
        tags,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load Modbus settings',
      error: error.message,
    });
  }
});

/**
 * GET /api/db/devices
 * Ambil semua Modbus device.
 */
router.get('/devices', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM modbus_devices
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get Modbus devices',
      error: error.message,
    });
  }
});

/**
 * PUT /api/db/devices/:id
 * Update setting koneksi Modbus.
 */
router.put('/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      host,
      port,
      unit_id,
      timeout_ms,
      poll_interval_ms,
      is_enabled,
    } = req.body;

    await pool.query(
      `
      UPDATE modbus_devices
      SET
        name = ?,
        host = ?,
        port = ?,
        unit_id = ?,
        timeout_ms = ?,
        poll_interval_ms = ?,
        is_enabled = ?
      WHERE id = ?
      `,
      [
        name,
        host,
        Number(port),
        Number(unit_id),
        Number(timeout_ms),
        Number(poll_interval_ms),
        is_enabled ? 1 : 0,
        id,
      ]
    );

    res.json({
      success: true,
      message: 'Modbus device updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update Modbus device',
      error: error.message,
    });
  }
});

/**
 * GET /api/db/pumps
 * Ambil semua pump.
 */
router.get('/pumps', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.*,
        md.name AS device_name,
        md.host AS device_host
      FROM pumps p
      JOIN modbus_devices md ON md.id = p.modbus_device_id
      ORDER BY p.display_order ASC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get pumps',
      error: error.message,
    });
  }
});

/**
 * GET /api/db/modbus-tags
 * Ambil semua register/tag Modbus.
 */
router.get('/modbus-tags', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        mt.*,
        p.pump_code,
        p.pump_name,
        md.name AS device_name
      FROM modbus_tags mt
      JOIN pumps p ON p.id = mt.pump_id
      JOIN modbus_devices md ON md.id = mt.modbus_device_id
      ORDER BY p.display_order ASC, mt.tag_key ASC
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get Modbus tags',
      error: error.message,
    });
  }
});

/**
 * POST /api/db/modbus-tags
 * Tambah register/tag baru.
 */
router.post('/modbus-tags', async (req, res) => {
  try {
    const {
      modbus_device_id,
      pump_id,
      tag_key,
      label,
      register_type,

      plc_address,
      address_area,
      address_start,
      address_end,

      register_address,
      quantity,
      read_function_code,
      write_function_code,
      data_type,
      scale_value,
      offset_value,
      unit,
      is_readable,
      is_writable,
      min_value,
      max_value,
      byte_order,
      word_order,
      is_enabled,
    } = req.body;

    const [result] = await pool.query(
      `
      INSERT INTO modbus_tags (
        modbus_device_id,
        pump_id,
        tag_key,
        label,
        register_type,

        plc_address,
        address_area,
        address_start,
        address_end,

        register_address,
        quantity,
        read_function_code,
        write_function_code,
        data_type,
        scale_value,
        offset_value,
        unit,
        is_readable,
        is_writable,
        min_value,
        max_value,
        byte_order,
        word_order,
        is_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(modbus_device_id),
        Number(pump_id),
        tag_key,
        label,
        register_type,

        plc_address || null,
        address_area || null,
        address_start === null || address_start === '' ? null : Number(address_start),
        address_end === null || address_end === '' ? null : Number(address_end),

        Number(register_address),
        Number(quantity || 1),
        read_function_code === null || read_function_code === '' ? null : Number(read_function_code),
        write_function_code === null || write_function_code === '' ? null : Number(write_function_code),
        data_type || 'uint16',
        Number(scale_value || 1),
        Number(offset_value || 0),
        unit || null,
        is_readable ? 1 : 0,
        is_writable ? 1 : 0,
        min_value === null || min_value === '' ? null : Number(min_value),
        max_value === null || max_value === '' ? null : Number(max_value),
        byte_order || 'ABCD',
        word_order || 'ABCD',
        is_enabled ? 1 : 0,
      ]
    );

    res.json({
      success: true,
      message: 'Modbus tag created successfully',
      data: {
        id: result.insertId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create Modbus tag',
      error: error.message,
    });
  }
});

/**
 * PUT /api/db/modbus-tags/:id
 * Update register/tag Modbus.
 */
router.put('/modbus-tags/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      modbus_device_id,
      pump_id,
      tag_key,
      label,
      register_type,

      plc_address,
      address_area,
      address_start,
      address_end,

      register_address,
      quantity,
      read_function_code,
      write_function_code,
      data_type,
      scale_value,
      offset_value,
      unit,
      is_readable,
      is_writable,
      min_value,
      max_value,
      byte_order,
      word_order,
      is_enabled,
    } = req.body;

    await pool.query(
      `
      UPDATE modbus_tags
      SET
        modbus_device_id = ?,
        pump_id = ?,
        tag_key = ?,
        label = ?,
        register_type = ?,

        plc_address = ?,
        address_area = ?,
        address_start = ?,
        address_end = ?,

        register_address = ?,
        quantity = ?,
        read_function_code = ?,
        write_function_code = ?,
        data_type = ?,
        scale_value = ?,
        offset_value = ?,
        unit = ?,
        is_readable = ?,
        is_writable = ?,
        min_value = ?,
        max_value = ?,
        byte_order = ?,
        word_order = ?,
        is_enabled = ?
      WHERE id = ?
      `,
      [
        Number(modbus_device_id),
        Number(pump_id),
        tag_key,
        label,
        register_type,

        plc_address || null,
        address_area || null,
        address_start === null || address_start === '' ? null : Number(address_start),
        address_end === null || address_end === '' ? null : Number(address_end),

        Number(register_address),
        Number(quantity || 1),
        read_function_code === null || read_function_code === '' ? null : Number(read_function_code),
        write_function_code === null || write_function_code === '' ? null : Number(write_function_code),
        data_type || 'uint16',
        Number(scale_value || 1),
        Number(offset_value || 0),
        unit || null,
        is_readable ? 1 : 0,
        is_writable ? 1 : 0,
        min_value === null || min_value === '' ? null : Number(min_value),
        max_value === null || max_value === '' ? null : Number(max_value),
        byte_order || 'ABCD',
        word_order || 'ABCD',
        is_enabled ? 1 : 0,
        id,
      ]
    );

    res.json({
      success: true,
      message: 'Modbus tag updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update Modbus tag',
      error: error.message,
    });
  }
});
/**
 * PATCH /api/db/modbus-tags/:id/enabled
 * Enable / disable register.
 */
router.patch('/modbus-tags/:id/enabled', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_enabled } = req.body;

    await pool.query(
      `
      UPDATE modbus_tags
      SET is_enabled = ?
      WHERE id = ?
      `,
      [is_enabled ? 1 : 0, id]
    );

    res.json({
      success: true,
      message: 'Modbus tag status updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update Modbus tag status',
      error: error.message,
    });
  }
});

/**
 * GET /api/db/latest-values
 * Ambil data terbaru untuk dashboard.
 */
router.get('/latest-values', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.id AS pump_id,
        p.pump_code,
        p.pump_name,

        mt.id AS tag_id,
        mt.tag_key,
        mt.label,
        mt.unit,

        lmv.raw_value,
        lmv.value_number,
        lmv.value_text,
        lmv.quality,
        lmv.updated_at

      FROM latest_modbus_values lmv
      JOIN pumps p ON p.id = lmv.pump_id
      JOIN modbus_tags mt ON mt.id = lmv.tag_id
      WHERE p.is_enabled = 1
      ORDER BY p.display_order ASC, mt.tag_key ASC
    `);

    const grouped = {};

    rows.forEach((row) => {
      if (!grouped[row.pump_id]) {
        grouped[row.pump_id] = {
          id: row.pump_id,
          pump_code: row.pump_code,
          pump_name: row.pump_name,
          values: {},
        };
      }

      grouped[row.pump_id].values[row.tag_key] = {
        tag_id: row.tag_id,
        label: row.label,
        value_number: row.value_number,
        value_text: row.value_text,
        raw_value: row.raw_value,
        unit: row.unit,
        quality: row.quality,
        updated_at: row.updated_at,
      };
    });

    res.json({
      success: true,
      data: Object.values(grouped),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get latest values',
      error: error.message,
    });
  }
});
/**
 * GET /api/db/datalogs
 * Historical PLC / Modbus reading logs.
 */
router.get('/datalogs', async (req, res) => {
  try {
    const {
      pump_id,
      tag_key,
      from,
      to,
      limit = 500,
      offset = 0,
    } = req.query;

    const where = [];
    const params = [];

    if (pump_id) {
      where.push('mrv.pump_id = ?');
      params.push(Number(pump_id));
    }

    if (tag_key) {
      where.push('mt.tag_key = ?');
      params.push(tag_key);
    }

    if (from) {
      where.push('mrb.created_at >= ?');
      params.push(String(from).length === 10 ? `${from} 00:00:00` : from);
    }

    if (to) {
      where.push('mrb.created_at <= ?');
      params.push(String(to).length === 10 ? `${to} 23:59:59` : to);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const safeLimit = Math.min(Number(limit) || 500, 2000);
    const safeOffset = Number(offset) || 0;

    const [rows] = await pool.query(
      `
      SELECT
        mrv.id,
        mrb.id AS batch_id,
        mrb.created_at AS logged_at,

        p.id AS pump_id,
        p.pump_code,
        p.pump_name,

        mt.id AS tag_id,
        mt.tag_key,
        mt.label,
        mt.plc_address,
        mt.register_type,
        mt.register_address,
        mt.unit,

        mrv.raw_value,
        mrv.value_number,
        mrv.value_text

      FROM modbus_reading_values mrv
      JOIN modbus_reading_batches mrb ON mrb.id = mrv.batch_id
      JOIN pumps p ON p.id = mrv.pump_id
      JOIN modbus_tags mt ON mt.id = mrv.tag_id

      ${whereSql}

      ORDER BY mrb.created_at DESC, mrv.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, safeLimit, safeOffset]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get datalogs',
      error: error.message,
    });
  }
});

/**
 * GET /api/db/command-logs
 * Historical command logs from dashboard/operator.
 */
router.get('/command-logs', async (req, res) => {
  try {
    const {
      pump_id,
      command,
      from,
      to,
      limit = 500,
      offset = 0,
    } = req.query;

    const where = [];
    const params = [];

    if (pump_id) {
      where.push('pcl.pump_id = ?');
      params.push(Number(pump_id));
    }

    if (command) {
      where.push('pcl.command = ?');
      params.push(command);
    }

    if (from) {
      where.push('pcl.created_at >= ?');
      params.push(String(from).length === 10 ? `${from} 00:00:00` : from);
    }

    if (to) {
      where.push('pcl.created_at <= ?');
      params.push(String(to).length === 10 ? `${to} 23:59:59` : to);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const safeLimit = Math.min(Number(limit) || 500, 2000);
    const safeOffset = Number(offset) || 0;

    const [rows] = await pool.query(
      `
      SELECT
        pcl.id,
        pcl.created_at AS logged_at,
        pcl.user_id,
        pcl.pump_id,
        p.pump_code,
        p.pump_name,

        pcl.tag_id,
        mt.tag_key,
        mt.label,
        mt.plc_address,

        pcl.command,
        pcl.requested_value,
        pcl.raw_value,
        pcl.success,
        pcl.message

      FROM pump_command_logs pcl
      LEFT JOIN pumps p ON p.id = pcl.pump_id
      LEFT JOIN modbus_tags mt ON mt.id = pcl.tag_id

      ${whereSql}

      ORDER BY pcl.created_at DESC, pcl.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, safeLimit, safeOffset]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get command logs',
      error: error.message,
    });
  }
});

/**
 * GET /api/db/history-chart
 *
 * Query:
 * pump_id=1
 * tag_keys=power
 * from=2026-05-22
 * to=2026-05-26
 * max_points=100000
 */
router.get('/history-chart', async (req, res) => {
  try {
    const {
      pump_id,
      tag_keys,
      from,
      to,
      max_points = 100000,
    } = req.query;

    const safeLimit = Math.min(Number(max_points) || 100000, 100000);

    const toDate = to
      ? new Date(String(to).length === 10 ? `${to}T23:59:59` : to)
      : new Date();

    const fromDate = from
      ? new Date(String(from).length === 10 ? `${from}T00:00:00` : from)
      : new Date(toDate.getTime() - 24 * 60 * 60 * 1000);

    const fromSql = formatMysqlDate(fromDate);
    const toSql = formatMysqlDate(toDate);

    const where = [
      'mrv.value_number IS NOT NULL',
      'mrb.created_at BETWEEN ? AND ?',
    ];

    const params = [fromSql, toSql];

    if (pump_id) {
      where.push('mrv.pump_id = ?');
      params.push(Number(pump_id));
    }

    if (tag_keys) {
      const keys = String(tag_keys)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (keys.length > 0) {
        where.push(`mt.tag_key IN (${keys.map(() => '?').join(',')})`);
        params.push(...keys);
      }
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const [rows] = await pool.query(
      `
      SELECT
        mrb.created_at AS logged_at,

        p.id AS pump_id,
        p.pump_code,
        p.pump_name,

        mt.id AS tag_id,
        mt.tag_key,
        mt.label,
        mt.unit,

        mrv.raw_value,
        mrv.value_number,
        mrv.value_text

      FROM modbus_reading_values mrv
      JOIN modbus_reading_batches mrb ON mrb.id = mrv.batch_id
      JOIN pumps p ON p.id = mrv.pump_id
      JOIN modbus_tags mt ON mt.id = mrv.tag_id

      ${whereSql}

      ORDER BY mrb.created_at ASC, mrv.id ASC
      LIMIT ?
      `,
      [...params, safeLimit]
    );

    return res.json({
      success: true,
      meta: {
        from: fromSql,
        to: toSql,
        max_points: safeLimit,
        mode: 'raw',
      },
      data: rows,
    });
  } catch (error) {
    console.error('[DB] History chart error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get history chart data',
      error: error.message,
    });
  }
});

function formatMysqlDate(date) {
  const pad = (value) => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(':');
}
module.exports = router;