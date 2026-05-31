const express = require('express');

const router = express.Router();

const modbusService = require('../services/modbusService');

const { pool } = require('../config/db');

const OPERATOR_PIN = process.env.OPERATOR_PIN || '1234';

let latestWaterLevel = {
  levelPercent: 0,
  rawValue: 0,
  plcAddress: '%MW160',
  updatedAt: null,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeWaterLevelWithRetry(rawValue, retries = 5) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await modbusService.writeHoldingRegister(160, rawValue);
    } catch (error) {
      lastError = error;

      const message = String(error.message || '').toLowerCase();

      const isBusy =
        message.includes('slave device busy') ||
        message.includes('exception 6');

      if (!isBusy || attempt === retries) {
        throw error;
      }

      await delay(300);
    }
  }

  throw lastError;
}

function validateOperatorPin(operatorPin) {
  if (!operatorPin) {
    return {
      ok: false,
      status: 400,
      message: 'Operator PIN is required',
    };
  }

  if (String(operatorPin) !== String(OPERATOR_PIN)) {
    return {
      ok: false,
      status: 403,
      message: 'Invalid operator PIN',
    };
  }

  return {
    ok: true,
  };
}

router.get('/modbus/config', (req, res) => {
  res.json({
    success: true,
    data: modbusService.getConfig(),
  });
});

router.post('/modbus/config', (req, res) => {
  const updatedConfig = modbusService.updateConfig(req.body);

  res.json({
    success: true,
    message: 'Modbus config updated',
    data: updatedConfig,
  });
});

router.post('/modbus/test', async (req, res) => {
  const result = await modbusService.testConnection(req.body);

  const statusCode = result.success ? 200 : 400;

  res.status(statusCode).json(result);
});

router.get('/modbus/status', (req, res) => {
  res.json({
    success: true,
    data: modbusService.getConnectionStatus(),
  });
});

router.post('/modbus/read', async (req, res) => {
  try {
    const { address, quantity } = req.body;

    const data = await modbusService.readHoldingRegister(
      address,
      quantity || 1,
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to read register',
    });
  }
});

router.post('/modbus/write-register', async (req, res) => {
  try {
    const { address, value } = req.body;

    const result = await modbusService.writeHoldingRegister(
      address,
      value,
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to write register',
    });
  }
});

router.post('/modbus/write-coil', async (req, res) => {
  try {
    const { address, value } = req.body;

    const result = await modbusService.writeCoil(address, value);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to write coil',
    });
  }
});

router.post('/units', async (req, res) => {
  try {
    const {
      pumpName,
      pumpCode,
      deviceId = 1,
    } = req.body;

    if (!pumpName || !String(pumpName).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pump name is required',
      });
    }

    const cleanPumpName = String(pumpName).trim();
    const cleanPumpCode =
      pumpCode && String(pumpCode).trim()
        ? String(pumpCode).trim()
        : cleanPumpName.toUpperCase().replace(/\s+/g, '_');

    const [columns] = await pool.query('SHOW COLUMNS FROM pumps');
    const columnNames = columns.map((column) => column.Field);

    const [maxRows] = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM pumps'
    );

    const nextOrder = maxRows?.[0]?.next_order || 1;

    const fields = [];
    const placeholders = [];
    const values = [];

    function addField(field, value) {
      if (columnNames.includes(field)) {
        fields.push(field);
        placeholders.push('?');
        values.push(value);
      }
    }

    addField('pump_name', cleanPumpName);
    addField('name', cleanPumpName);
    addField('pump_code', cleanPumpCode);
    addField('code', cleanPumpCode);
    addField('modbus_device_id', Number(deviceId));
    addField('device_id', Number(deviceId));
    addField('display_order', nextOrder);
    addField('is_enabled', 1);

    if (fields.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'No compatible column found in pumps table',
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO pumps
        (${fields.join(', ')})
      VALUES
        (${placeholders.join(', ')})
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT *
      FROM pumps
      WHERE id = ?
      `,
      [result.insertId]
    );

    return res.json({
      success: true,
      message: 'Pump unit added successfully',
      data: rows[0],
    });
  } catch (error) {
    console.error('[MODBUS] Add unit failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to add pump unit',
      error: error.message,
    });
  }
});
router.post('/tags', async (req, res) => {
  try {
    const {
      pumpId,
      deviceId = 1,
      tagKey,
      label,
      plcAddress,
      registerAddress,
      registerType,
      dataType,
      quantity,
      unit,
      scaleValue,
      offsetValue,
      contactType,
      byteOrder,
      wordOrder,
      isReadable,
      isWritable,
      isEnabled,
      operatorPin,
    } = req.body;

    const pinCheck = validateOperatorPin(operatorPin);

    if (!pinCheck.ok) {
      return res.status(pinCheck.status).json({
        success: false,
        message: pinCheck.message,
      });
    }

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message: 'Pump is required',
      });
    }

    if (!tagKey || !String(tagKey).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tag key is required',
      });
    }

    if (!label || !String(label).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Label is required',
      });
    }

    const cleanRegisterType = String(registerType || '').trim().toLowerCase();

    const allowedRegisterTypes = [
      'coil',
      'discrete_input',
      'holding_register',
      'input_register',
    ];

    if (!allowedRegisterTypes.includes(cleanRegisterType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid register type',
      });
    }

    const cleanDataType = String(
      dataType || getDefaultDataType(cleanRegisterType),
    ).trim().toLowerCase();

    const cleanContactType = normalizeContactType(contactType);
    const cleanByteOrder = normalizeByteOrder(byteOrder);
    const cleanWordOrder = normalizeByteOrder(wordOrder);

    const cleanPlcAddress = String(plcAddress || '').trim();

    const finalRegisterAddress =
      registerAddress !== undefined &&
      registerAddress !== null &&
      String(registerAddress).trim() !== ''
        ? Number(registerAddress)
        : parsePlcAddress(cleanPlcAddress);

    if (!Number.isFinite(finalRegisterAddress) || finalRegisterAddress < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid register address',
      });
    }

    const is32BitDataType = is32BitType(cleanDataType);

    const finalQuantity =
      quantity !== undefined &&
      quantity !== null &&
      String(quantity).trim() !== ''
        ? Math.max(1, Number(quantity || 1))
        : is32BitDataType
          ? 2
          : 1;

    const readFunctionCode = getReadFunctionCode(cleanRegisterType);
    const writeFunctionCode = getWriteFunctionCode(
      cleanRegisterType,
      Boolean(isWritable),
    );

    const cleanTagKey = String(tagKey)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    const [duplicateRows] = await pool.query(
      `
      SELECT id
      FROM modbus_tags
      WHERE pump_id = ?
        AND tag_key = ?
      LIMIT 1
      `,
      [Number(pumpId), cleanTagKey],
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Tag key "${cleanTagKey}" already exists for this pump`,
      });
    }

    const [sameAddressRows] = await pool.query(
      `
      SELECT id, tag_key, label
      FROM modbus_tags
      WHERE pump_id = ?
        AND register_type = ?
        AND register_address = ?
      LIMIT 1
      `,
      [Number(pumpId), cleanRegisterType, finalRegisterAddress],
    );

    if (sameAddressRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Address already used by tag "${sameAddressRows[0].tag_key}"`,
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO modbus_tags
      (
        modbus_device_id,
        pump_id,
        tag_key,
        label,
        register_type,
        plc_address,
        register_address,
        quantity,
        read_function_code,
        write_function_code,
        data_type,
        contact_type,
        byte_order,
        word_order,
        scale_value,
        offset_value,
        unit,
        is_readable,
        is_writable,
        is_enabled
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(deviceId),
        Number(pumpId),
        cleanTagKey,
        String(label).trim(),
        cleanRegisterType,
        cleanPlcAddress || buildPlcAddress(cleanRegisterType, finalRegisterAddress),
        finalRegisterAddress,
        finalQuantity,
        readFunctionCode,
        writeFunctionCode,
        cleanDataType,
        cleanContactType,
        cleanByteOrder,
        cleanWordOrder,
        Number(scaleValue ?? 1),
        Number(offsetValue ?? 0),
        unit || null,
        isReadable === undefined ? 1 : Boolean(isReadable) ? 1 : 0,
        Boolean(isWritable) ? 1 : 0,
        isEnabled === undefined ? 1 : Boolean(isEnabled) ? 1 : 0,
      ],
    );

    const [rows] = await pool.query(
      `
      SELECT *
      FROM modbus_tags
      WHERE id = ?
      `,
      [result.insertId],
    );

    return res.json({
      success: true,
      message: 'PLC tag mapping added successfully',
      data: rows[0],
    });
  } catch (error) {
    console.error('[MODBUS] Add tag failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to add PLC tag mapping',
      error: error.message,
    });
  }
});

function parsePlcAddress(plcAddress) {
  const text = String(plcAddress || '').trim().toUpperCase();

  const match = text.match(/%M(W)?(\d+)/);

  if (match) {
    return Number(match[2]);
  }

  const numberMatch = text.match(/\d+/);

  if (numberMatch) {
    return Number(numberMatch[0]);
  }

  return NaN;
}

function buildPlcAddress(registerType, registerAddress) {
  if (registerType === 'coil' || registerType === 'discrete_input') {
    return `%M${registerAddress}`;
  }

  return `%MW${registerAddress}`;
}

function getReadFunctionCode(registerType) {
  if (registerType === 'coil') return 1;
  if (registerType === 'discrete_input') return 2;
  if (registerType === 'holding_register') return 3;
  if (registerType === 'input_register') return 4;

  return 3;
}

function getWriteFunctionCode(registerType, isWritable) {
  if (!isWritable) return null;

  if (registerType === 'coil') return 5;
  if (registerType === 'holding_register') return 6;

  return null;
}

function getDefaultDataType(registerType) {
  if (registerType === 'coil' || registerType === 'discrete_input') {
    return 'bool';
  }

  return 'float32';
}
function getDefaultDataType(registerType) {
  if (registerType === 'coil' || registerType === 'discrete_input') {
    return 'bool';
  }

  return 'float32';
}
function is32BitType(dataType) {
  const cleanDataType = String(dataType || '').toLowerCase();

  return (
    cleanDataType === 'uint32' ||
    cleanDataType === 'int32' ||
    cleanDataType === 'float' ||
    cleanDataType === 'float32' ||
    cleanDataType === 'real'
  );
}

function normalizeByteOrder(value) {
  const cleanValue = String(value || 'ABCD').trim().toUpperCase();

  if (['ABCD', 'CDAB', 'BADC', 'DCBA'].includes(cleanValue)) {
    return cleanValue;
  }

  return 'ABCD';
}

function normalizeContactType(value) {
  const cleanValue = String(value || 'NO').trim().toUpperCase();

  if (['NO', 'NC'].includes(cleanValue)) {
    return cleanValue;
  }

  return 'NO';
}
router.put('/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pumpName, pumpCode, operatorPin } = req.body;
    const pinCheck = validateOperatorPin(operatorPin);

if (!pinCheck.ok) {
  return res.status(pinCheck.status).json({
    success: false,
    message: pinCheck.message,
  });
}

    if (!pumpName || !String(pumpName).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Pump name is required',
      });
    }

    const cleanPumpName = String(pumpName).trim();

    const cleanPumpCode =
      pumpCode && String(pumpCode).trim()
        ? String(pumpCode).trim()
        : cleanPumpName.toUpperCase().replace(/\s+/g, '_');

    await pool.query(
      `
      UPDATE pumps
      SET
        pump_name = ?,
        pump_code = ?
      WHERE id = ?
      `,
      [cleanPumpName, cleanPumpCode, Number(id)]
    );

    const [rows] = await pool.query(
      `
      SELECT *
      FROM pumps
      WHERE id = ?
      `,
      [Number(id)]
    );

    return res.json({
      success: true,
      message: 'Pump unit updated successfully',
      data: rows[0],
    });
  } catch (error) {
    console.error('[MODBUS] Update unit failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update pump unit',
      error: error.message,
    });
  }
});

router.delete('/units/:id/permanent', async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const { id } = req.params;
    const { operatorPin } = req.body || {};

    const pumpId = Number(id);

    if (!Number.isInteger(pumpId) || pumpId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pump ID',
      });
    }

    const pinCheck = validateOperatorPin(operatorPin);

    if (!pinCheck.ok) {
      return res.status(pinCheck.status).json({
        success: false,
        message: pinCheck.message,
      });
    }

    connection = await pool.getConnection();

    const [pumpRows] = await connection.query(
      `
      SELECT id, pump_name, is_enabled
      FROM pumps
      WHERE id = ?
      LIMIT 1
      `,
      [pumpId]
    );

    if (pumpRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pump unit not found',
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    // 1. Delete latest value kalau tabelnya ada
    await deleteByPumpIdIfExists(
      connection,
      'latest_modbus_values',
      pumpId
    );

    // 2. Delete command logs kalau tabelnya ada
    await deleteByPumpIdIfExists(
      connection,
      'pump_command_logs',
      pumpId
    );

    // 3. Delete reading values via tag_id
    // Karena modbus_reading_values biasanya tidak punya pump_id,
    // tapi punya tag_id yang refer ke modbus_tags.id
    await connection.query(
      `
      DELETE mrv
      FROM modbus_reading_values mrv
      INNER JOIN modbus_tags mt ON mt.id = mrv.tag_id
      WHERE mt.pump_id = ?
      `,
      [pumpId]
    );

    // 4. Delete tags
    await connection.query(
      `
      DELETE FROM modbus_tags
      WHERE pump_id = ?
      `,
      [pumpId]
    );

    // 5. Delete pump
    await connection.query(
      `
      DELETE FROM pumps
      WHERE id = ?
      `,
      [pumpId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: 'Pump unit permanently deleted successfully',
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
    }

    console.error('[MODBUS] Permanent delete unit failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to permanently delete pump unit',
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.patch('/units/:id/enabled', async (req, res) => {
  try {
    const { id } = req.params;
    const { isEnabled, operatorPin } = req.body;

    const pinCheck = validateOperatorPin(operatorPin);

    if (!pinCheck.ok) {
      return res.status(pinCheck.status).json({
        success: false,
        message: pinCheck.message,
      });
    }

    if (isEnabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isEnabled is required',
      });
    }

    await pool.query(
      `
      UPDATE pumps
      SET is_enabled = ?
      WHERE id = ?
      `,
      [Boolean(isEnabled) ? 1 : 0, Number(id)]
    );

    return res.json({
      success: true,
      message: Boolean(isEnabled)
        ? 'Pump unit enabled successfully'
        : 'Pump unit disabled successfully',
    });
  } catch (error) {
    console.error('[MODBUS] Toggle unit failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update pump unit status',
      error: error.message,
    });
  }
});

// router.delete('/units/:id/permanent', async (req, res) => {
//   const connection = await pool.getConnection();

//   try {
//     const { id } = req.params;
//     const { operatorPin } = req.body || {};

//     const pinCheck = validateOperatorPin(operatorPin);

//     if (!pinCheck.ok) {
//       return res.status(pinCheck.status).json({
//         success: false,
//         message: pinCheck.message,
//       });
//     }

//     const [pumpRows] = await connection.query(
//       `
//       SELECT id, pump_name, is_enabled
//       FROM pumps
//       WHERE id = ?
//       LIMIT 1
//       `,
//       [Number(id)]
//     );

//     if (pumpRows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Pump unit not found',
//       });
//     }

//     const pump = pumpRows[0];

//     if (Number(pump.is_enabled ?? 1) === 1) {
//       return res.status(400).json({
//         success: false,
//         message: 'Disable pump first before permanent delete',
//       });
//     }

//     await connection.beginTransaction();

//     // Delete latest values
//     await deleteByPumpIdIfExists(connection, 'latest_modbus_values', Number(id));

//     // Delete history values
//     await deleteByPumpIdIfExists(connection, 'modbus_reading_values', Number(id));

//     // Delete command logs
//     await deleteByPumpIdIfExists(connection, 'pump_command_logs', Number(id));

//     // Delete tags
//     await connection.query(
//       `
//       DELETE FROM modbus_tags
//       WHERE pump_id = ?
//       `,
//       [Number(id)]
//     );

//     // Delete pump
//     await connection.query(
//       `
//       DELETE FROM pumps
//       WHERE id = ?
//       `,
//       [Number(id)]
//     );

//     await connection.commit();

//     return res.json({
//       success: true,
//       message: 'Pump unit permanently deleted successfully',
//     });
//   } catch (error) {
//     await connection.rollback();

//     console.error('[MODBUS] Permanent delete unit failed:', error);

//     return res.status(500).json({
//       success: false,
//       message: 'Failed to permanently delete pump unit',
//       error: error.message,
//     });
//   } finally {
//     connection.release();
//   }
// });

async function deleteByPumpIdIfExists(connection, tableName, pumpId) {
  const [columns] = await connection.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = 'pump_id'
    `,
    [tableName]
  );

  if (columns.length === 0) return;

  await connection.query(
    `
    DELETE FROM ${tableName}
    WHERE pump_id = ?
    `,
    [pumpId]
  );
}

router.put('/tags/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      pumpId,
      deviceId = 1,
      tagKey,
      label,
      plcAddress,
      registerAddress,
      registerType,
      dataType,
      quantity,
      unit,
      scaleValue,
      offsetValue,
      contactType,
      byteOrder,
      wordOrder,
      isReadable,
      isWritable,
      isEnabled,
      operatorPin,
    } = req.body;

    const pinCheck = validateOperatorPin(operatorPin);

    if (!pinCheck.ok) {
      return res.status(pinCheck.status).json({
        success: false,
        message: pinCheck.message,
      });
    }

    if (!tagKey || !String(tagKey).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tag key is required',
      });
    }

    if (!label || !String(label).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Label is required',
      });
    }

    const cleanRegisterType = String(registerType || '').trim().toLowerCase();

    const allowedRegisterTypes = [
      'coil',
      'discrete_input',
      'holding_register',
      'input_register',
    ];

    if (!allowedRegisterTypes.includes(cleanRegisterType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid register type',
      });
    }

    const cleanDataType = String(
      dataType || getDefaultDataType(cleanRegisterType),
    ).trim().toLowerCase();

    const cleanContactType = normalizeContactType(contactType);
    const cleanByteOrder = normalizeByteOrder(byteOrder);
    const cleanWordOrder = normalizeByteOrder(wordOrder);

    const finalRegisterAddress = Number(registerAddress);

    if (!Number.isFinite(finalRegisterAddress) || finalRegisterAddress < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid register address',
      });
    }

    const is32BitDataType = is32BitType(cleanDataType);

    const finalQuantity =
      quantity !== undefined &&
      quantity !== null &&
      String(quantity).trim() !== ''
        ? Math.max(1, Number(quantity || 1))
        : is32BitDataType
          ? 2
          : 1;

    const readFunctionCode = getReadFunctionCode(cleanRegisterType);
    const writeFunctionCode = getWriteFunctionCode(
      cleanRegisterType,
      Boolean(isWritable),
    );

    const cleanTagKey = String(tagKey)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    const [duplicateRows] = await pool.query(
      `
      SELECT id
      FROM modbus_tags
      WHERE pump_id = ?
        AND tag_key = ?
        AND id <> ?
      LIMIT 1
      `,
      [Number(pumpId), cleanTagKey, Number(id)],
    );

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Tag key "${cleanTagKey}" already exists for this pump`,
      });
    }

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
        register_address = ?,
        quantity = ?,
        read_function_code = ?,
        write_function_code = ?,
        data_type = ?,
        contact_type = ?,
        byte_order = ?,
        word_order = ?,
        scale_value = ?,
        offset_value = ?,
        unit = ?,
        is_readable = ?,
        is_writable = ?,
        is_enabled = ?
      WHERE id = ?
      `,
      [
        Number(deviceId),
        Number(pumpId),
        cleanTagKey,
        String(label).trim(),
        cleanRegisterType,
        plcAddress || buildPlcAddress(cleanRegisterType, finalRegisterAddress),
        finalRegisterAddress,
        finalQuantity,
        readFunctionCode,
        writeFunctionCode,
        cleanDataType,
        cleanContactType,
        cleanByteOrder,
        cleanWordOrder,
        Number(scaleValue ?? 1),
        Number(offsetValue ?? 0),
        unit || null,
        Boolean(isReadable) ? 1 : 0,
        Boolean(isWritable) ? 1 : 0,
        Boolean(isEnabled) ? 1 : 0,
        Number(id),
      ],
    );

    const [rows] = await pool.query(
      `
      SELECT *
      FROM modbus_tags
      WHERE id = ?
      `,
      [Number(id)],
    );

    return res.json({
      success: true,
      message: 'PLC tag mapping updated successfully',
      data: rows[0],
    });
  } catch (error) {
    console.error('[MODBUS] Update tag failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update PLC tag mapping',
      error: error.message,
    });
  }
});
router.patch('/tags/:id/enabled', async (req, res) => {
  try {
    const { id } = req.params;
    const { isEnabled } = req.body;

    await pool.query(
      `
      UPDATE modbus_tags
      SET is_enabled = ?
      WHERE id = ?
      `,
      [Boolean(isEnabled) ? 1 : 0, Number(id)],
    );

    return res.json({
      success: true,
      message: Boolean(isEnabled)
        ? 'PLC tag enabled successfully'
        : 'PLC tag disabled successfully',
    });
  } catch (error) {
    console.error('[MODBUS] Toggle tag failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update PLC tag status',
      error: error.message,
    });
  }
});

router.post('/water-level', async (req, res) => {
  try {
    const { level } = req.body;

    const numericLevel = Number(level);

    if (!Number.isFinite(numericLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Water level harus angka',
      });
    }

    if (numericLevel < 0 || numericLevel > 100) {
      return res.status(400).json({
        success: false,
        message: 'Water level harus di antara 0 sampai 100 persen',
      });
    }

    const rawValue = Math.round(numericLevel * 10);

    const writeResult = await writeWaterLevelWithRetry(rawValue);

    latestWaterLevel = {
      levelPercent: Number(numericLevel.toFixed(1)),
      rawValue,
      plcAddress: '%MW160',
      updatedAt: new Date().toISOString(),
      writeResult,
    };

    return res.json({
      success: true,
      message: 'Water level berhasil ditulis ke PLC',
      data: latestWaterLevel,
    });
  } catch (error) {
    console.error('[WATER LEVEL WRITE ERROR]', error);

    return res.status(500).json({
      success: false,
      message: 'Gagal menulis water level ke PLC',
      error: error.message,
    });
  }
});

router.get('/water-level/latest', (req, res) => {
  return res.json({
    success: true,
    data: latestWaterLevel,
  });
});

router.get('/level-status', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        mt.id,
        mt.pump_id,
        mt.tag_key,
        mt.label,
        mt.plc_address,
        mt.register_address,
        mt.data_type,
        lmv.raw_value,
        lmv.value_number,
        lmv.value_text,
        lmv.quality,
        lmv.updated_at
      FROM modbus_tags mt
      LEFT JOIN latest_modbus_values lmv
        ON lmv.tag_id = mt.id
      WHERE mt.register_type = 'coil'
        AND mt.register_address BETWEEN 126 AND 133
        AND mt.plc_address IS NOT NULL
        AND mt.is_enabled = 1
      ORDER BY mt.register_address ASC
      `
    );

    const items = rows.map((row) => {
      const rawText = String(row.raw_value || '').toLowerCase();

      const active =
        Number(row.value_number) === 1 ||
        rawText === 'true' ||
        rawText === '1';

      return {
        id: row.id,
        pumpId: row.pump_id,
        tagKey: row.tag_key,
        label: row.label,
        plcAddress: row.plc_address,
        registerAddress: row.register_address,
        active,
        quality: row.quality,
        updatedAt: row.updated_at,
      };
    });

    const llItems = items.filter((item) =>
      String(item.tagKey || '').toLowerCase().startsWith('ll')
    );

    const hlItems = items.filter((item) =>
      String(item.tagKey || '').toLowerCase().startsWith('hl')
    );

    return res.json({
      success: true,
      data: {
        items,
        summary: {
          llActive: llItems.some((item) => item.active),
          hlActive: hlItems.some((item) => item.active),
          activeLL: llItems.filter((item) => item.active),
          activeHL: hlItems.filter((item) => item.active),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil status level LL/HL',
      error: error.message,
    });
  }
});

router.patch('/tags/:id/contact-type', async (req, res) => {
  try {
    const { id } = req.params;
    const { contactType, operatorPin } = req.body;

    const pinCheck = validateOperatorPin(operatorPin);

    if (!pinCheck.ok) {
      return res.status(pinCheck.status).json({
        success: false,
        message: pinCheck.message,
      });
    }

    const cleanContactType = String(contactType || '').trim().toUpperCase();

    if (!['NO', 'NC'].includes(cleanContactType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact type. Use NO or NC.',
      });
    }

    const [tagRows] = await pool.query(
      `
      SELECT id, register_type
      FROM modbus_tags
      WHERE id = ?
      LIMIT 1
      `,
      [Number(id)],
    );

    if (tagRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PLC tag not found',
      });
    }

    const registerType = String(tagRows[0].register_type || '').toLowerCase();

    const isBooleanTag =
      registerType === 'coil' || registerType === 'discrete_input';

    if (!isBooleanTag) {
      return res.status(400).json({
        success: false,
        message: 'Contact type only applies to coil or discrete input tags',
      });
    }

    await pool.query(
      `
      UPDATE modbus_tags
      SET contact_type = ?
      WHERE id = ?
      `,
      [cleanContactType, Number(id)],
    );

    const [rows] = await pool.query(
      `
      SELECT *
      FROM modbus_tags
      WHERE id = ?
      `,
      [Number(id)],
    );

    return res.json({
      success: true,
      message: `Contact type updated to ${cleanContactType}`,
      data: rows[0],
    });
  } catch (error) {
    console.error('[MODBUS] Update contact type failed:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update contact type',
      error: error.message,
    });
  }
});
module.exports = router;