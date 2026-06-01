const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');
const modbusService = require('../services/modbusService');

const {
  writeCoil,
  writeHoldingRegister,
  writeFloat32Register,
} = modbusService;

const OPERATOR_PIN = process.env.OPERATOR_PIN || '1234';

router.post('/command', async (req, res) => {
  const {
    pumpId,
    pumpName,
    command,
    speedRef,
    operatorPin,
  } = req.body;

  

  console.log('[BACKEND] /pump/command HIT');
  console.log('[BACKEND] body:', req.body);

  if (!pumpId) {
    return res.status(400).json({
      success: false,
      message: 'pumpId is required',
    });
  }

  if (!command) {
    return res.status(400).json({
      success: false,
      message: 'command is required',
    });
  }

  if (!operatorPin) {
    return res.status(400).json({
      success: false,
      message: 'Operator PIN is required',
    });
  }

  if (String(operatorPin) !== String(OPERATOR_PIN)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid operator PIN',
    });
  }

  try {
    const normalizedCommand = String(command).toUpperCase();

    let result;

    if (normalizedCommand === 'START') {
  const permissive = await validateStartPermissive(pumpId);

  if (!permissive.allowed) {
    await insertCommandLog({
      pumpId,
      tagId: null,
      command: 'START',
      requestedValue: '1',
      rawValue: null,
      success: 0,
      message: permissive.message,
    });

    return res.status(400).json({
      success: false,
      message: permissive.message,
    });
  }

  result = await executeBinaryCommand({
  pumpId,
  command: 'START',
  aliases: ['start'],
  value: 1,
  pulse: true,
});
}else if (normalizedCommand === 'STOP') {
  result = await executeBinaryCommand({
  pumpId,
  command: 'STOP',
  aliases: ['stop'],
  value: 1,
  pulse: true,
});
} else if (
  normalizedCommand === 'SUBMIT_SPEED_REF' ||
  normalizedCommand === 'SPEED_REF' ||
  normalizedCommand === 'SET_SPEED_REF'
) {
      if (speedRef === null || speedRef === undefined || speedRef === '') {
        return res.status(400).json({
          success: false,
          message: 'Speed ref is required',
        });
      }

      result = await executeSpeedRefCommand({
        pumpId,
        speedRef,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Unsupported command: ${command}`,
      });
    }

    await insertCommandLog({
      pumpId,
      tagId: result.tag?.id || null,
      command: normalizedCommand,
      requestedValue:
        normalizedCommand === 'SUBMIT_SPEED_REF'
          ? speedRef
          : result.rawValue,
      rawValue: result.rawValue,
      success: 1,
      message: result.message,
    });

    return res.json({
      success: true,
      message: result.message || `${normalizedCommand} command executed`,
      data: {
        pumpId,
        pumpName,
        command: normalizedCommand,
        tag: result.tag,
      },
    });
  } catch (error) {
    await insertCommandLog({
      pumpId,
      tagId: null,
      command,
      requestedValue:
  String(command).toUpperCase() === 'SUBMIT_SPEED_REF'
    ? speedRef
    : String(command).toUpperCase() === 'STOP'
      ? '0'
      : '1',
      rawValue: null,
      success: 0,
      message: error.message,
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute pump command',
    });
  }
});
async function validateStartPermissive(pumpId) {
  const [rows] = await pool.query(
    `
    SELECT
      t.tag_key,
      t.label,
      l.value_number,
      l.value_text,
      l.raw_value
    FROM latest_modbus_values l
    JOIN modbus_tags t ON t.id = l.tag_id
    WHERE l.pump_id = ?
    `,
    [pumpId]
  );

  const values = {};

  rows.forEach((row) => {
    values[row.tag_key] =
      row.value_text ??
      row.value_number ??
      row.raw_value;
  });

  const remote = toBool(values.remote);

  const emergencyStop = toBool(
    values.emergency_stop ??
      values.emergency ??
      values.emg
  );

  const vsdRun = toBool(
    values.vsd_run ??
      values.run_feedback ??
      values.run_status ??
      values.status
  );

  const alarmKeys = [
    'vsd_alarm',
    'alarm',
    'fault',
    'bimetal',
    'mstc',
    'mech_seal',
    'low_bearing',
    'lower_bearing',
    'lower_bearing_fault',
    'up_bearing',
    'upper_bearing',
    'upper_bearing_fault',
  ];

  const activeAlarms = alarmKeys.filter((key) => toBool(values[key]));

  console.log('[START VALIDATION]', {
    pumpId,
    values,
    remoteRaw: values.remote,
    remoteBool: remote,
    emergencyStop,
    vsdRun,
    activeAlarms,
  });

  if (!remote) {
    return {
      allowed: false,
      message: 'START rejected: pump is not in remote mode',
    };
  }

  if (emergencyStop) {
    return {
      allowed: false,
      message: 'START rejected: emergency stop is active',
    };
  }

  if (activeAlarms.length > 0) {
    return {
      allowed: false,
      message: `START rejected: active alarm/fault detected (${activeAlarms.join(', ')})`,
    };
  }

  if (vsdRun) {
    return {
      allowed: false,
      message: 'START rejected: pump is already running',
    };
  }

  return {
    allowed: true,
    message: 'START permissive OK',
  };
}

function toBool(value) {
  if (value === true) return true;
  if (value === false) return false;

  if (value === 1) return true;
  if (value === 0) return false;

  const text = String(value ?? '').trim().toLowerCase();

  if (
    text === '1' ||
    text === 'true' ||
    text === 'on' ||
    text === 'running' ||
    text === 'active' ||
    text === 'yes'
  ) {
    return true;
  }

  if (
    text === '0' ||
    text === 'false' ||
    text === 'off' ||
    text === 'stopped' ||
    text === 'inactive' ||
    text === 'no' ||
    text === ''
  ) {
    return false;
  }

  return false;
}

async function executeBinaryCommand({
  pumpId,
  command,
  aliases,
  value,
  pulse = true,
}) {
  const tag = await findWritableTagByAliases(pumpId, aliases);

  if (!tag) {
    throw new Error(
      `No writable ${command} tag found for pump ${pumpId}`
    );
  }

  await writeTag(tag, value);

 if (pulse) {
  const pulseMs = Number(process.env.COMMAND_PULSE_MS || 300);

  setTimeout(async () => {
    try {
      await writeTag(tag, 0);
    } catch (error) {
      console.log(`[PUMP COMMAND] Failed to reset ${command}:`, error.message);
    }
  }, pulseMs);
}

  return {
    tag,
    rawValue: String(value),
    message: `${command} command sent successfully`,
  };
}
// async function executeSpeedRefCommand({
//   pumpId,
//   speedRef,
// }) {
//   const tag = await findWritableTagByAliases(pumpId, [
//   'reff_speed',
//   'ref_speed',
//   'speed_ref',
//   'speed_reference',
//   'vsd_speed_ref',
//   'set_speed',
//   'rpm_ref',
// ]);

//   if (!tag) {
//     throw new Error(`No writable speed reference tag found for pump ${pumpId}`);
//   }

//   const value = Number(speedRef);

//   if (Number.isNaN(value)) {
//     throw new Error('Invalid speed reference value');
//   }

//   const rawValue = Math.round(
//     (value - Number(tag.offset_value || 0)) / Number(tag.scale_value || 1)
//   );
// console.log('[PUMP COMMAND] Speed ref command:', {
//   pumpId,
//   speedRef,
//   tag_key: tag.tag_key,
//   register_type: tag.register_type,
//   plc_address: tag.plc_address,
//   register_address: tag.register_address,
//   write_function_code: tag.write_function_code,
//   scale_value: tag.scale_value,
//   offset_value: tag.offset_value,
//   rawValue,
// });
//   await writeTag(tag, rawValue);

//   return {
//     tag,
//     rawValue: String(rawValue),
//     message: `Speed reference set to ${speedRef}`,
//   };
// }

async function findWritableTagByAliases(pumpId, aliases) {
  const placeholders = aliases.map(() => '?').join(',');

  const [rows] = await pool.query(
    `
    SELECT
      id,
      modbus_device_id,
      pump_id,
      tag_key,
      label,
      register_type,
      register_address,
      quantity,
      write_function_code,
      data_type,
      scale_value,
      offset_value,
      is_writable,
      is_enabled
    FROM modbus_tags
    WHERE pump_id = ?
      AND is_enabled = 1
      AND is_writable = 1
      AND LOWER(tag_key) IN (${placeholders})
    ORDER BY id ASC
    LIMIT 1
    `,
    [pumpId, ...aliases.map((item) => String(item).toLowerCase())]
  );

  return rows[0] || null;
}

async function writeTag(tag, value) {
  console.log('[BACKEND] writeTag:', {
    tag_key: tag.tag_key,
    register_type: tag.register_type,
    register_address: tag.register_address,
    write_function_code: tag.write_function_code,
    value,
  });

  const registerType = String(tag.register_type || '').toLowerCase();
  const writeFunctionCode = Number(tag.write_function_code || 0);

  if (
    registerType === 'coil' ||
    registerType === 'coils' ||
    writeFunctionCode === 5 ||
    writeFunctionCode === 15
  ) {
    console.log('[BACKEND] Writing coil...');
    await writeCoil(tag.register_address, Number(value) === 1);
    return;
  }

  console.log('[BACKEND] Writing holding register...');
  await writeHoldingRegister(tag.register_address, Number(value));
}

async function insertCommandLog({
  pumpId,
  tagId,
  command,
  requestedValue,
  rawValue,
  success,
  message,
}) {
  try {
    await pool.query(
      `
      INSERT INTO pump_command_logs
        (user_id, pump_id, tag_id, command, requested_value, raw_value, success, message)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        null,
        pumpId,
        tagId,
        command,
        requestedValue,
        rawValue,
        success,
        message,
      ]
    );
  } catch (error) {
    console.log('[PUMP COMMAND] Failed to insert command log:', error.message);
  }
}
async function executeSpeedRefCommand({ pumpId, speedRef }) {
  const numericSpeedRef = Number(speedRef);

  if (!Number.isFinite(numericSpeedRef)) {
    throw new Error('Speed reference must be a valid number');
  }

  const [rows] = await pool.query(
    `
    SELECT
      id,
      pump_id,
      tag_key,
      label,
      plc_address,
      register_type,
      register_address,
      quantity,
      write_function_code,
      data_type,
      byte_order,
      word_order,
      scale_value,
      offset_value,
      unit,
      is_writable,
      is_enabled
    FROM modbus_tags
    WHERE pump_id = ?
  AND LOWER(tag_key) IN (
    'reff_speed',
    'ref_speed',
    'speed_ref',
    'speed_reference',
    'vsd_speed_ref',
    'set_speed',
    'rpm_ref'
  )
  AND is_enabled = 1
  AND is_writable = 1
ORDER BY id ASC
LIMIT 1
    `,
    [Number(pumpId)]
  );

  if (rows.length === 0) {
    throw new Error('Speed reference tag not found or not writable');
  }

  const tag = rows[0];

  const registerType = String(tag.register_type || '').toLowerCase();
  const dataType = String(tag.data_type || '').toLowerCase();

  if (registerType !== 'holding_register') {
    throw new Error('Speed reference must use holding_register');
  }

  let writeResult;

  if (
  dataType === 'float' ||
  dataType === 'float32' ||
  dataType === 'real'
) {
  writeResult = await writeFloat32Register(
    tag.register_address,
    numericSpeedRef,
    tag
  );
} else {
  writeResult = await writeHoldingRegister(
    tag.register_address,
    numericSpeedRef
  );
}

  // update latest value langsung supaya UI/DB langsung kelihatan berubah
  await pool.query(
    `
    INSERT INTO latest_modbus_values
      (pump_id, tag_id, last_batch_id, raw_value, value_number, value_text, quality)
    VALUES
      (?, ?, NULL, ?, ?, NULL, 'good')
    ON DUPLICATE KEY UPDATE
      raw_value = VALUES(raw_value),
      value_number = VALUES(value_number),
      value_text = VALUES(value_text),
      quality = 'good',
      updated_at = CURRENT_TIMESTAMP(3)
    `,
    [
      Number(pumpId),
      tag.id,
      writeResult?.values ? writeResult.values.join(',') : String(numericSpeedRef),
      numericSpeedRef,
    ]
  );

  return {
    tag,
    rawValue: String(numericSpeedRef),
    message: `Speed reference set to ${numericSpeedRef} ${tag.unit || 'RPM'}`,
    writeResult,
  };
}
module.exports = router;