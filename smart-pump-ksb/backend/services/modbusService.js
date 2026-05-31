const ModbusRTU = require('modbus-serial');

const { pool: db } = require('../config/db');
const defaultConfig = require('../config/modbusConfig');

let client = new ModbusRTU();
let activeConfig = { ...defaultConfig };
let isConnected = false;

let pollingTimer = null;
let isPolling = false;

const DEBUG_MODBUS_READ = process.env.DEBUG_MODBUS_READ === '1';
const DEBUG_TAG_KEY = process.env.DEBUG_TAG_KEY || '';

function shouldDebugTag(tag) {
  if (!DEBUG_MODBUS_READ) return false;
  if (!DEBUG_TAG_KEY) return true;

  return String(tag.tag_key || '').toLowerCase() === DEBUG_TAG_KEY.toLowerCase();
}

function getDebugRealAddress(tag) {
  const registerType = String(tag.register_type || '').toLowerCase();

  if (
    registerType === 'holding_register' ||
    registerType === 'input_register'
  ) {
    return normalizeRegisterAddress(tag.register_address);
  }

  return Number(tag.register_address);
}

function attachClientErrorHandler(modbusClient) {
  modbusClient.on('error', (error) => {
    console.error('[MODBUS] Client socket error:', error.message);

    isConnected = false;

    try {
      if (modbusClient.isOpen) {
        modbusClient.close();
      }
    } catch (closeError) {
      console.error('[MODBUS] Failed to close client after error:', closeError.message);
    }
  });
}

async function connectModbus(config = activeConfig) {
  try {
    try {
      if (client && client.isOpen) {
        client.close();
      }
    } catch (closeError) {
      console.error('[MODBUS] Close old connection failed:', closeError.message);
    }

    client = new ModbusRTU();
    attachClientErrorHandler(client);

    client.setTimeout(Number(config.timeout || config.timeout_ms) || 5000);

    await client.connectTCP(config.host, {
      port: Number(config.port) || 502,
    });

    client.setID(Number(config.unitId || config.unit_id) || 1);

    activeConfig = {
      ...activeConfig,
      ...config,
    };

    isConnected = true;

    return {
      success: true,
      message: 'Modbus connected successfully',
      config: activeConfig,
    };
  } catch (error) {
    isConnected = false;

    try {
      if (client && client.isOpen) {
        client.close();
      }
    } catch (closeError) {
      console.error('[MODBUS] Close failed after connect error:', closeError.message);
    }

    return {
      success: false,
      message: error.message || 'Failed to connect Modbus',
    };
  }
}

async function testConnection(config = activeConfig) {
  try {
    const testClient = new ModbusRTU();

    testClient.setTimeout(Number(config.timeout || config.timeout_ms) || 5000);

    await testClient.connectTCP(config.host, {
      port: Number(config.port) || 502,
    });

    testClient.setID(Number(config.unitId || config.unit_id) || 1);

    if (testClient.isOpen) {
      testClient.close();
    }

    return {
      success: true,
      message: 'Modbus connected successfully',
      config,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to connect Modbus',
    };
  }
}

async function readHoldingRegister(address, quantity = 1) {
  if (!client.isOpen) {
    await connectModbus();
  }

  const realAddress = normalizeRegisterAddress(address);
  const finalQuantity = Math.max(1, Number(quantity || 1));

  console.log('[MODBUS HREG READ]', {
    inputAddress: address,
    realAddress,
    quantity: finalQuantity,
  });

  const result = await client.readHoldingRegisters(realAddress, finalQuantity);

  return result.data;
}

async function readCoil(address, quantity = 1) {
  if (!client.isOpen) {
    await connectModbus();
  }

  const targetAddress = Number(address);

  const baseAddress = targetAddress >= 100 ? 100 : targetAddress;
  const selectedIndex = targetAddress - baseAddress;
  const readQuantity = Math.max(1, selectedIndex + 1);

  const result = await client.readCoils(baseAddress, readQuantity);

  const selectedValue = Boolean(result.data?.[selectedIndex]);

  return [selectedValue];
}

async function readDiscreteInput(address, quantity = 1) {
  if (!client.isOpen) {
    await connectModbus();
  }

  const targetAddress = Number(address);
  const finalQuantity = Math.max(1, Number(quantity || 1));

  const result = await client.readDiscreteInputs(targetAddress, finalQuantity);

  return result.data;
}

async function writeHoldingRegister(address, value) {
  if (!client.isOpen) {
    await connectModbus();
  }

  const realAddress = normalizeRegisterAddress(address);

  await client.writeRegister(realAddress, Number(value));

  return {
    success: true,
    message: 'Register written successfully',
    address,
    realAddress,
    value,
  };
}

async function writeCoil(address, value) {
  if (!client.isOpen) {
    await connectModbus();
  }

  const realAddress = Number(address);

  await client.writeCoil(realAddress, Boolean(value));

  return {
    success: true,
    message: 'Coil written successfully',
    address,
    realAddress,
    value,
  };
}

async function pulseCoil(address, pulseMs = 300) {
  if (!client.isOpen) {
    await connectModbus();
  }

  const realAddress = Number(address);

  if (!Number.isFinite(realAddress)) {
    throw new Error(`Invalid coil address: ${address}`);
  }

  const finalPulseMs = Number(pulseMs || process.env.COMMAND_PULSE_MS || 300);

  console.log('[MODBUS] pulseCoil ON:', {
    address,
    realAddress,
    pulseMs: finalPulseMs,
  });

  await client.writeCoil(realAddress, true);

  await delay(finalPulseMs);

  console.log('[MODBUS] pulseCoil OFF:', {
    address,
    realAddress,
  });

  await client.writeCoil(realAddress, false);

  return {
    success: true,
    message: 'Coil pulse sent successfully',
    address,
    realAddress,
    pulseMs: finalPulseMs,
  };
}

async function pulseTag(tag, pulseMs = 300) {
  if (!tag) {
    throw new Error('Pulse tag is required');
  }

  const registerType = String(tag.register_type || '').toLowerCase();

  if (registerType !== 'coil' && registerType !== 'coils') {
    throw new Error('Pulse tag only supports coil register type');
  }

  return pulseCoil(tag.register_address, pulseMs);
}

async function startModbusPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
  }

  console.log('[MODBUS] Polling service started');

  pollAllDevices().catch((error) => {
    console.error('[MODBUS] Initial polling error:', error.message);
  });

  pollingTimer = setInterval(() => {
    pollAllDevices().catch((error) => {
      console.error('[MODBUS] Polling interval error:', error.message);
    });
  }, Number(activeConfig.poll_interval_ms || activeConfig.pollingInterval || 3000));
}

function stopModbusPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }

  console.log('[MODBUS] Polling service stopped');
}

async function pollAllDevices() {
  if (isPolling) return;

  isPolling = true;

  try {
    const [devices] = await db.query(`
      SELECT
        id,
        name,
        host,
        port,
        unit_id,
        timeout_ms,
        poll_interval_ms,
        is_enabled
      FROM modbus_devices
      WHERE is_enabled = 1
    `);

    for (const device of devices) {
      await pollDevice(device);
    }
  } catch (error) {
    console.error('[MODBUS] Polling failed:', error.message);
  } finally {
    isPolling = false;
  }
}

async function pollDevice(device) {
  console.log('[MODBUS] Polling device:', {
    id: device.id,
    name: device.name,
    host: device.host,
    port: device.port,
    unitId: device.unit_id,
  });

  const connection = await connectModbus({
    host: device.host,
    port: device.port,
    unitId: device.unit_id,
    timeout: device.timeout_ms,
  });

  if (!connection.success) {
    console.error('[MODBUS] Connection failed:', connection.message);
    return;
  }

  const [tags] = await db.query(
    `
    SELECT
      id,
      modbus_device_id,
      pump_id,
      tag_key,
      label,
      plc_address,
      register_type,
      register_address,
      quantity,
      read_function_code,
      data_type,
      scale_value,
      offset_value,
      unit,
      is_readable,
      is_writable,
      is_enabled,
      contact_type,
      byte_order,
      word_order
    FROM modbus_tags
    WHERE modbus_device_id = ?
      AND is_enabled = 1
      AND is_readable = 1
      AND LOWER(tag_key) NOT IN (
        'start',
        'stop',
        'reset',
        'reset_alarm',
        'start_command',
        'stop_command',
        'reset_command'
      )
    ORDER BY register_address ASC
    `,
    [device.id],
  );

  const [batchResult] = await db.query(
    `
    INSERT INTO modbus_reading_batches
      (modbus_device_id, success, response_time_ms, error_message)
    VALUES
      (?, 1, NULL, NULL)
    `,
    [device.id],
  );

  const batchId = batchResult.insertId;

  for (const tag of tags) {
    try {
      const rawData = await readTag(tag);
      const parsedValue = parseTagValue(rawData, tag);

      if (shouldDebugTag(tag)) {
        console.log('[MODBUS READ DEBUG]', {
          pumpId: tag.pump_id,
          tagKey: tag.tag_key,
          label: tag.label,
          plcAddress: tag.plc_address,
          dbAddress: tag.register_address,
          realAddress: getDebugRealAddress(tag),
          registerType: tag.register_type,
          quantity: tag.quantity,
          readFunctionCode: tag.read_function_code,
          dataType: tag.data_type,
          byteOrder: tag.byte_order,
          wordOrder: tag.word_order,
          contactType: tag.contact_type,
          scale: tag.scale_value,
          offset: tag.offset_value,
          rawData,
          parsedValue,
          unit: tag.unit,
        });
      }

      await saveReadingValue({
        batchId,
        tag,
        rawData,
        parsedValue,
      });

      await delay(100);
    } catch (error) {
      console.error('[MODBUS] Read tag failed:', {
        id: tag.id,
        pumpId: tag.pump_id,
        tag: tag.tag_key,
        label: tag.label,
        plcAddress: tag.plc_address,
        address: tag.register_address,
        type: tag.register_type,
        function_code: tag.read_function_code,
        readable: tag.is_readable,
        enabled: tag.is_enabled,
        dataType: tag.data_type,
        byteOrder: tag.byte_order,
        wordOrder: tag.word_order,
        contactType: tag.contact_type,
        error: error.message,
      });

      await delay(100);
      continue;
    }
  }
}

async function readTag(tag) {
  const registerType = String(tag.register_type || '').toLowerCase();
  const readFunctionCode = Number(tag.read_function_code || 0);

  if (
    registerType === 'coil' ||
    registerType === 'coils' ||
    readFunctionCode === 1
  ) {
    return readCoil(tag.register_address, 1);
  }

  if (
    registerType === 'discrete_input' ||
    registerType === 'discrete_inputs' ||
    readFunctionCode === 2
  ) {
    return readDiscreteInput(tag.register_address, 1);
  }

  return readHoldingRegister(tag.register_address, Number(tag.quantity || 1));
}

function parseTagValue(rawData, tag) {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return null;
  }

  const registerType = String(tag.register_type || '').toLowerCase();
  const dataType = String(tag.data_type || 'uint16').toLowerCase();

  const isBoolTag =
    dataType === 'bool' ||
    dataType === 'boolean' ||
    registerType === 'coil' ||
    registerType === 'coils' ||
    registerType === 'discrete_input' ||
    registerType === 'discrete_inputs';

  if (isBoolTag) {
    return parseBooleanValue(rawData[0], tag);
  }

  let rawValue;

  if (dataType === 'uint16') {
    rawValue = parseUInt16(rawData[0]);
  } else if (dataType === 'int16') {
    rawValue = parseInt16(rawData[0]);
  } else if (dataType === 'uint32') {
    rawValue = parseUInt32(rawData, tag);
  } else if (dataType === 'int32') {
    rawValue = parseInt32(rawData, tag);
  } else if (
    dataType === 'float' ||
    dataType === 'float32' ||
    dataType === 'real'
  ) {
    rawValue = parseFloat32(rawData, tag);
  } else {
    rawValue = Number(rawData[0]);
  }

  const scale = Number(tag.scale_value ?? 1);
  const offset = Number(tag.offset_value ?? 0);

  return rawValue * scale + offset;
}

function parseBooleanValue(rawValue, tag) {
  const rawNumber =
    rawValue === true ||
    rawValue === 1 ||
    rawValue === '1' ||
    String(rawValue).toLowerCase() === 'true'
      ? 1
      : 0;

  const contactType = String(tag.contact_type || 'NO').toUpperCase();

  if (contactType === 'NC') {
    return rawNumber === 1 ? 0 : 1;
  }

  return rawNumber;
}

function parseUInt16(word) {
  return Number(word) & 0xffff;
}

function parseInt16(word) {
  const value = Number(word) & 0xffff;

  return value >= 0x8000 ? value - 0x10000 : value;
}

function parseUInt32(registers, tag) {
  const buffer = build32BitBuffer(registers, tag);

  return buffer.readUInt32BE(0);
}

function parseInt32(registers, tag) {
  const buffer = build32BitBuffer(registers, tag);

  return buffer.readInt32BE(0);
}

function parseFloat32(registers, tag) {
  const buffer = build32BitBuffer(registers, tag);

  return buffer.readFloatBE(0);
}

function build32BitBuffer(registers, tag) {
  if (!Array.isArray(registers) || registers.length < 2) {
    throw new Error(
      `Tag ${tag.tag_key || tag.id} requires 2 registers for 32-bit value`,
    );
  }

  const bytes = registersToBytes(registers[0], registers[1]);
  const orderedBytes = applyByteOrder(bytes, tag);

  return Buffer.from(orderedBytes);
}

function registersToBytes(word1, word2) {
  const first = Number(word1) & 0xffff;
  const second = Number(word2) & 0xffff;

  const a = (first >> 8) & 0xff;
  const b = first & 0xff;
  const c = (second >> 8) & 0xff;
  const d = second & 0xff;

  return [a, b, c, d];
}

function applyByteOrder(bytes, tag) {
  const order = getByteOrder(tag);
  const [a, b, c, d] = bytes;

  if (order === 'ABCD') {
    return [a, b, c, d];
  }

  if (order === 'CDAB') {
    return [c, d, a, b];
  }

  if (order === 'BADC') {
    return [b, a, d, c];
  }

  if (order === 'DCBA') {
    return [d, c, b, a];
  }

  return [a, b, c, d];
}

function getByteOrder(tag) {
  const byteOrder = String(
    tag.byte_order || tag.word_order || 'ABCD',
  ).toUpperCase();

  if (['ABCD', 'CDAB', 'BADC', 'DCBA'].includes(byteOrder)) {
    return byteOrder;
  }

  return 'ABCD';
}

async function saveReadingValue({ batchId, tag, rawData, parsedValue }) {
  const registerType = String(tag.register_type || '').toLowerCase();
  const dataType = String(tag.data_type || '').toLowerCase();

  const isBoolTag =
    dataType === 'bool' ||
    dataType === 'boolean' ||
    registerType === 'coil' ||
    registerType === 'coils' ||
    registerType === 'discrete_input' ||
    registerType === 'discrete_inputs';

  const rawValue = isBoolTag
    ? String(Boolean(rawData?.[0]))
    : Array.isArray(rawData)
      ? rawData.join(',')
      : String(rawData);

  const valueNumber =
    typeof parsedValue === 'number' && Number.isFinite(parsedValue)
      ? parsedValue
      : null;

  const valueText =
    valueNumber === null && parsedValue !== null && parsedValue !== undefined
      ? String(parsedValue)
      : null;

  await db.query(
    `
    INSERT INTO modbus_reading_values
      (batch_id, pump_id, tag_id, raw_value, value_number, value_text)
    VALUES
      (?, ?, ?, ?, ?, ?)
    `,
    [
      batchId,
      tag.pump_id,
      tag.id,
      rawValue,
      valueNumber,
      valueText,
    ],
  );

  await db.query(
    `
    INSERT INTO latest_modbus_values
      (pump_id, tag_id, last_batch_id, raw_value, value_number, value_text, quality)
    VALUES
      (?, ?, ?, ?, ?, ?, 'good')
    ON DUPLICATE KEY UPDATE
      last_batch_id = VALUES(last_batch_id),
      raw_value = VALUES(raw_value),
      value_number = VALUES(value_number),
      value_text = VALUES(value_text),
      quality = 'good',
      updated_at = CURRENT_TIMESTAMP(3)
    `,
    [
      tag.pump_id,
      tag.id,
      batchId,
      rawValue,
      valueNumber,
      valueText,
    ],
  );
}

function normalizeRegisterAddress(address) {
  const num = Number(address);

  if (!Number.isFinite(num)) {
    throw new Error(`Invalid register address: ${address}`);
  }

  if (num >= 40001) {
    return num - 40001;
  }

  if (num >= 30001) {
    return num - 30001;
  }

  const baseOffset = Number(process.env.MODBUS_REGISTER_BASE_OFFSET || 0);
  const oneBased =
    String(process.env.MODBUS_REGISTER_ONE_BASED || '0') === '1';

  const normalized = oneBased ? num - 1 : num;

  return Math.max(0, normalized + baseOffset);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getConfig() {
  return activeConfig;
}

function updateConfig(newConfig) {
  activeConfig = {
    ...activeConfig,
    ...newConfig,
  };

  return activeConfig;
}

function getConnectionStatus() {
  return {
    connected: isConnected && client.isOpen,
    host: activeConfig.host,
    port: activeConfig.port,
    unitId: activeConfig.unitId || activeConfig.unit_id,
  };
}

module.exports = {
  connectModbus,
  testConnection,

  readHoldingRegister,
  readCoil,
  readDiscreteInput,

  writeHoldingRegister,
  writeCoil,
  pulseCoil,
  pulseTag,

  getConfig,
  updateConfig,
  getConnectionStatus,

  startModbusPolling,
  stopModbusPolling,
  pollAllDevices,
};