const express = require('express');

const router = express.Router();

const { pool } = require('../config/db');

const ALARM_RULES = {
  vsd_alarm: {
    type: 'ALARM',
    activeWhen: 1,
    text: (pumpName) => `${pumpName} VSD Alarm`,
  },
  bimetal: {
    type: 'ALARM',
    activeWhen: 1,
    text: (pumpName) => `${pumpName} Bimetal Trip`,
  },
  emg: {
    type: 'ALARM',
    activeWhen: 1,
    text: (pumpName) => `${pumpName} Emergency Stop`,
  },
  emergency: {
    type: 'ALARM',
    activeWhen: 1,
    text: (pumpName) => `${pumpName} Emergency Stop`,
  },
  remote: {
    type: 'WARNING',
    activeWhen: 0,
    text: (pumpName) => `${pumpName} Remote Mode OFF`,
  },
  vsd_run: {
    type: 'INFORMATION',
    activeWhen: 1,
    text: (pumpName) => `${pumpName} Running`,
  },
};

router.get('/summary', async (req, res) => {
  try {
    const items = await getRealtimeAlarmItems();

    await syncAlarmEvents(items);

    const activeItems = items.filter((item) => item.status === 'ACTIVE');

    const summary = {
      alarm: activeItems.filter((item) => item.alarmType === 'ALARM').length,
      warning: activeItems.filter((item) => item.alarmType === 'WARNING').length,
      information: activeItems.filter((item) => item.alarmType === 'INFORMATION').length,
    };

    return res.json({
      success: true,
      data: {
        summary,
        items: items.slice(0, 20),
      },
    });
  } catch (error) {
    console.error('[ALARMS] Summary failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get alarm summary',
      error: error.message,
    });
  }
});

/**
 * GET /api/alarms/logs
 * Ambil history alarm dari tabel alarm_events.
 * Sebelum baca history, sinkronkan dulu alarm realtime.
 */
router.get('/logs', async (req, res) => {
  try {
    const liveItems = await getRealtimeAlarmItems();
    await syncAlarmEvents(liveItems);

    const {
      pump_id,
      alarm_type,
      status,
      from,
      to,
      limit = 500,
      offset = 0,
    } = req.query;

    const where = [];
    const params = [];

    if (pump_id) {
      where.push('ae.pump_id = ?');
      params.push(Number(pump_id));
    }

    if (alarm_type) {
      where.push('ae.alarm_type = ?');
      params.push(alarm_type);
    }

    if (status) {
      where.push('ae.status = ?');
      params.push(status);
    }

    if (from) {
      where.push('ae.started_at >= ?');
      params.push(String(from).length === 10 ? `${from} 00:00:00` : from);
    }

    if (to) {
      where.push('ae.started_at <= ?');
      params.push(String(to).length === 10 ? `${to} 23:59:59` : to);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const safeLimit = Math.min(Number(limit) || 500, 2000);
    const safeOffset = Number(offset) || 0;

    const [rows] = await pool.query(
      `
      SELECT
        ae.id,
        ae.pump_id,
        p.pump_code,
        p.pump_name,

        ae.tag_id,
        mt.tag_key,
        mt.label,
        mt.plc_address,
        mt.unit,

        ae.alarm_type,
        ae.alarm_key,
        ae.alarm_text,
        ae.status,
        ae.value_number,
        ae.raw_value,
        ae.started_at,
        ae.ended_at,
        ae.updated_at

      FROM alarm_events ae
      LEFT JOIN pumps p ON p.id = ae.pump_id
      LEFT JOIN modbus_tags mt ON mt.id = ae.tag_id

      ${whereSql}

      ORDER BY ae.started_at DESC, ae.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, safeLimit, safeOffset]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('[ALARMS] Logs failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get alarm logs',
      error: error.message,
    });
  }
});
async function getRealtimeAlarmItems() {
  const [rows] = await pool.query(`
    SELECT
      p.id AS pump_id,
      p.pump_name,
      p.pump_code,
      t.id AS tag_id,
      t.tag_key,
      t.label,
      t.plc_address,
      t.register_type,
      t.register_address,
      l.raw_value,
      l.value_number,
      l.value_text,
      l.updated_at
    FROM latest_modbus_values l
    JOIN pumps p ON p.id = l.pump_id
    JOIN modbus_tags t ON t.id = l.tag_id
    WHERE t.is_enabled = 1
      AND t.tag_key IN (
        'vsd_alarm',
        'bimetal',
        'emg',
        'emergency',
        'remote',
        'vsd_run'
      )
    ORDER BY l.updated_at DESC
  `);

  return rows
    .map((row) => {
      const tagKey = String(row.tag_key || '').toLowerCase();
      const rule = ALARM_RULES[tagKey];

      if (!rule) return null;

      const value = normalizeValue(
        row.value_number,
        row.value_text,
        row.raw_value
      );

      const isActive = Number(value) === Number(rule.activeWhen);

      return {
        pumpId: row.pump_id,
        pumpName: row.pump_name,
        pumpCode: row.pump_code,
        tagId: row.tag_id,
        tagKey: row.tag_key,
        alarmType: rule.type,
        alarmKey: row.tag_key,
        alarmText: rule.text(row.pump_name),
        status: isActive ? 'ACTIVE' : 'NOT_ACTIVE',
        value,
        rawValue: row.raw_value,
        updatedAt: row.updated_at,
        date: formatDate(row.updated_at),
        time: formatTime(row.updated_at),
      };
    })
    .filter(Boolean);
}
/**
 * Sinkronkan kondisi realtime ke tabel alarm_events.
 * - Jika alarm ACTIVE dan belum ada event ACTIVE, insert event baru.
 * - Jika alarm NOT_ACTIVE dan sebelumnya ada event ACTIVE, tutup event dengan ended_at.
 */
async function syncAlarmEvents(items) {
  for (const item of items) {
    const alarmKey = item.alarmKey || item.tagKey;

    if (!item.pumpId || !item.tagId || !alarmKey) {
      continue;
    }

    if (item.status === 'ACTIVE') {
      const [activeRows] = await pool.query(
        `
        SELECT id
        FROM alarm_events
        WHERE pump_id = ?
          AND tag_id = ?
          AND alarm_key = ?
          AND status = 'ACTIVE'
        LIMIT 1
        `,
        [item.pumpId, item.tagId, alarmKey]
      );

      if (activeRows.length === 0) {
        await pool.query(
          `
          INSERT INTO alarm_events (
            pump_id,
            tag_id,
            alarm_type,
            alarm_key,
            alarm_text,
            status,
            value_number,
            raw_value,
            started_at,
            ended_at
          ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, NULL)
          `,
          [
            item.pumpId,
            item.tagId,
            item.alarmType,
            alarmKey,
            item.alarmText,
            Number(item.value),
            item.rawValue ?? null,
            toMysqlDateTime(item.updatedAt) || getNowMysqlDateTime(),
          ]
        );
      } else {
        await pool.query(
          `
          UPDATE alarm_events
          SET
            value_number = ?,
            raw_value = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [
            Number(item.value),
            item.rawValue ?? null,
            activeRows[0].id,
          ]
        );
      }
    }

    if (item.status === 'NOT_ACTIVE') {
      await pool.query(
        `
        UPDATE alarm_events
        SET
          status = 'NOT_ACTIVE',
          ended_at = ?,
          value_number = ?,
          raw_value = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE pump_id = ?
          AND tag_id = ?
          AND alarm_key = ?
          AND status = 'ACTIVE'
        `,
        [
          toMysqlDateTime(item.updatedAt) || getNowMysqlDateTime(),
          Number(item.value),
          item.rawValue ?? null,
          item.pumpId,
          item.tagId,
          alarmKey,
        ]
      );
    }
  }
}

function normalizeValue(valueNumber, valueText, rawValue) {
  if (valueNumber !== null && valueNumber !== undefined) {
    return Number(valueNumber);
  }

  const text = String(valueText ?? rawValue ?? '').trim().toLowerCase();

  if (text === 'true' || text === '1' || text === 'on' || text === 'active') {
    return 1;
  }

  if (text === 'false' || text === '0' || text === 'off' || text === 'not_active') {
    return 0;
  }

  return Number(text) || 0;
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatTime(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date).replace(/\./g, ':');
}

function toMysqlDateTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const pad = (num) => String(num).padStart(2, '0');

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

function getNowMysqlDateTime() {
  return toMysqlDateTime(new Date());
}

module.exports = router;