import API from './api';

export async function fetchModbusSettingsData() {
  const [settingsRes, latestRes] = await Promise.all([
    API.get('/db/settings'),
    API.get('/db/latest-values'),
  ]);

  const settingsData = settingsRes.data?.data || {};

  return {
    devices: settingsData.devices || [],
    pumps: settingsData.pumps || [],
    tags: settingsData.tags || [],
    latestValues: latestRes.data?.data || [],
  };
}
export async function deletePumpUnit(pumpId, operatorPin) {
  const res = await API.delete(`/modbus/units/${pumpId}/permanent`, {
    data: {
      operatorPin,
    },
  });

  return res.data;
}


export async function fetchLatestModbusValues() {
  const res = await API.get('/db/latest-values');

  return res.data?.data || [];
}

export async function testModbusConnection(payload) {
  const res = await API.post('/modbus/test', payload);

  return res.data;
}

export async function updateModbusDevice(deviceId, payload) {
  const res = await API.put(`/db/devices/${deviceId}`, payload);

  return res.data;
}

export async function addPumpUnit(payload) {
  const res = await API.post('/modbus/units', payload);

  return res.data;
}

export async function updatePumpUnit(pumpId, payload) {
  const res = await API.put(`/modbus/units/${pumpId}`, payload);

  return res.data;
}

export async function disablePumpUnit(pumpId, operatorPin) {
  const res = await API.delete(`/modbus/units/${pumpId}`, {
    data: {
      operatorPin,
    },
  });

  return res.data;
}
export async function addPlcTag(payload) {
  const res = await API.post('/modbus/tags', payload);

  return res.data;
}
export async function updatePlcTag(tagId, payload) {
  const res = await API.put(`/modbus/tags/${tagId}`, payload);

  return res.data;
}

export async function setPlcTagEnabled(tagId, isEnabled, operatorPin) {
  const res = await API.patch(`/modbus/tags/${tagId}/enabled`, {
    isEnabled,
    operatorPin,
  });

  

  return res.data;
}

