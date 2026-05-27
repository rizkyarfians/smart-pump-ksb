import { useEffect, useMemo, useState } from 'react';

import API from '../services/api';

const DEFAULT_FORM = {
  id: null,
  host: '',
  port: 502,
  unitId: 1,
  timeout: 3000,
  pollingInterval: 1000,
  isEnabled: true,
};

const DEFAULT_TAG_FORM = {
  pumpId: '',
  tagKey: '',
  label: '',
  plcAddress: '',
  registerAddress: '',
  registerType: 'holding_register',
  dataType: 'uint16',
  quantity: 1,
  unit: '',
  scaleValue: 1,
  offsetValue: 0,
  isReadable: true,
  isWritable: false,
  isEnabled: true,
};

export default function ModbusSettings() {
  const [form, setForm] = useState(DEFAULT_FORM);

  const [pumps, setPumps] = useState([]);
  const [tags, setTags] = useState([]);
  const [latestValues, setLatestValues] = useState([]);

  const [selectedPumpId, setSelectedPumpId] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('live');

  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);

  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [newUnit, setNewUnit] = useState({
    pumpName: '',
    pumpCode: '',
  });
  const [addingUnit, setAddingUnit] = useState(false);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagModalType, setTagModalType] = useState('register');
  const [newTag, setNewTag] = useState(DEFAULT_TAG_FORM);
  const [addingTag, setAddingTag] = useState(false);

  const [isRenameUnitOpen, setIsRenameUnitOpen] = useState(false);
const [editingUnit, setEditingUnit] = useState({
  id: '',
  pumpName: '',
  pumpCode: '',
});
  const [savingUnit, setSavingUnit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      await fetchAllData({ cancelled: () => cancelled });
    }, 0);

    const interval = setInterval(async () => {
      try {
        const res = await API.get('/db/latest-values');

        if (!cancelled) {
          setLatestValues(res.data?.data || []);
        }
      } catch (err) {
        console.log(err);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  async function fetchAllData({ cancelled } = {}) {
    try {
      const [settingsRes, latestRes] = await Promise.all([
        API.get('/db/settings'),
        API.get('/db/latest-values'),
      ]);

      if (cancelled?.()) return;

      const devices = settingsRes.data?.data?.devices || [];
      const pumpData = settingsRes.data?.data?.pumps || [];
      const tagData = settingsRes.data?.data?.tags || [];
      const latestData = latestRes.data?.data || [];

      const device = devices[0];

      if (device) {
        setForm({
          id: device.id,
          host: device.host || '',
          port: Number(device.port || 502),
          unitId: Number(device.unit_id || 1),
          timeout: Number(device.timeout_ms || 3000),
          pollingInterval: Number(device.poll_interval_ms || 1000),
          isEnabled: Number(device.is_enabled) === 1,
        });
      }

      setPumps(pumpData);
      setTags(tagData);
      setLatestValues(latestData);

      if (pumpData.length > 0) {
        setSelectedPumpId((prev) => {
          const stillExists = pumpData.some(
            (pump) => String(pump.id) === String(prev),
          );

          return stillExists ? prev : String(pumpData[0].id);
        });
      }
    } catch (err) {
      console.log(err);

      if (!cancelled?.()) {
        setTestResult({
          success: false,
          message: 'Failed to load Modbus database settings',
        });
      }
    }
  }

  const selectedPump = useMemo(() => {
    return pumps.find((pump) => String(pump.id) === String(selectedPumpId));
  }, [pumps, selectedPumpId]);

  const selectedPumpTags = useMemo(() => {
    return tags.filter((tag) => String(tag.pump_id) === String(selectedPumpId));
  }, [tags, selectedPumpId]);

  const selectedPumpLive = useMemo(() => {
    return latestValues.find(
      (pump) => String(pump.id) === String(selectedPumpId),
    );
  }, [latestValues, selectedPumpId]);

  const liveRows = useMemo(() => {
    const values = selectedPumpLive?.values || {};

    return Object.keys(values).map((key) => ({
      tagKey: key,
      ...values[key],
    }));
  }, [selectedPumpLive]);

  const coilRows = useMemo(() => {
    return selectedPumpTags.filter((tag) => {
      const registerType = String(tag.register_type || '').toLowerCase();
      const dataType = String(tag.data_type || '').toLowerCase();
      const tagKey = String(tag.tag_key || '').toLowerCase();

      return (
        registerType === 'coil' ||
        registerType === 'discrete_input' ||
        dataType === 'bool' ||
        tagKey.includes('alarm') ||
        tagKey.includes('fault') ||
        tagKey.includes('remote') ||
        tagKey.includes('run')
      );
    });
  }, [selectedPumpTags]);

  const getPumpConnectionStatus = (pumpId) => {
    const pumpLive = latestValues.find(
      (pump) => String(pump.id) === String(pumpId),
    );

    const values = pumpLive?.values || {};

    const lastUpdate = Object.values(values)
      .map((item) => item.updated_at)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    if (!lastUpdate || !currentTimeMs) {
      return 'disconnected';
    }

    const lastUpdateTime = new Date(lastUpdate).getTime();

    if (Number.isNaN(lastUpdateTime)) {
      return 'disconnected';
    }

    const diffMs = currentTimeMs - lastUpdateTime;

    const thresholdMs = Math.max(
      Number(form.pollingInterval || 1000) * 5,
      15000,
    );

    return diffMs <= thresholdMs ? 'connected' : 'disconnected';
  };

  const selectedConnectionStatus = getPumpConnectionStatus(selectedPumpId);

  const isAnyPumpConnected = pumps.some(
    (pump) => getPumpConnectionStatus(pump.id) === 'connected',
  );

  const visibleConnectionResult = isAnyPumpConnected
    ? {
        success: true,
        message: 'Modbus polling connected',
      }
    : testResult;

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const refreshLatestValues = async () => {
    try {
      setLiveLoading(true);

      const res = await API.get('/db/latest-values');

      setLatestValues(res.data?.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLiveLoading(false);
    }
  };

  const refreshSettingsAndLatest = async () => {
    await fetchAllData();
  };

  const openEditor = (pumpId, tab = 'live') => {
    setSelectedPumpId(String(pumpId));
    setActiveTab(tab);
    setIsEditorOpen(true);
  };

  const openAddUnitModal = () => {
    setNewUnit({
      pumpName: '',
      pumpCode: '',
    });
    setIsAddUnitOpen(true);
  };

  const handleAddUnit = async () => {
    try {
      setAddingUnit(true);
      setTestResult(null);

      const res = await API.post('/modbus/units', {
        pumpName: newUnit.pumpName,
        pumpCode: newUnit.pumpCode,
        deviceId: form.id || 1,
      });

      if (res.data?.success) {
        const insertedPump = res.data?.data;

        setIsAddUnitOpen(false);
        setNewUnit({
          pumpName: '',
          pumpCode: '',
        });

        await refreshSettingsAndLatest();

        if (insertedPump?.id) {
          setSelectedPumpId(String(insertedPump.id));
        }

        setTestResult({
          success: true,
          message: 'Pump unit added successfully',
        });
      }
    } catch (err) {
      console.log('Failed to add unit:', err);

      setTestResult({
        success: false,
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to add pump unit',
      });
    } finally {
      setAddingUnit(false);
    }
  };

  const openAddTagModal = (type = 'register') => {
    const isCoil = type === 'coil';
    const pumpId = selectedPumpId || pumps[0]?.id || '';

    setTagModalType(type);
    setNewTag({
      ...DEFAULT_TAG_FORM,
      pumpId: String(pumpId),
      registerType: isCoil ? 'coil' : 'holding_register',
      dataType: isCoil ? 'bool' : 'uint16',
      quantity: 1,
      isReadable: true,
      isWritable: false,
      isEnabled: true,
    });
    setIsTagModalOpen(true);
  };

  const handleAddTag = async () => {
    try {
      setAddingTag(true);
      setTestResult(null);

      const res = await API.post('/modbus/tags', {
        pumpId: newTag.pumpId,
        deviceId: form.id || 1,
        tagKey: newTag.tagKey,
        label: newTag.label,
        plcAddress: newTag.plcAddress,
        registerAddress: newTag.registerAddress,
        registerType: newTag.registerType,
        dataType: newTag.dataType,
        quantity: Number(newTag.quantity || 1),
        unit: newTag.unit,
        scaleValue: Number(newTag.scaleValue || 1),
        offsetValue: Number(newTag.offsetValue || 0),
        isReadable: Boolean(newTag.isReadable),
        isWritable: Boolean(newTag.isWritable),
        isEnabled: Boolean(newTag.isEnabled),
      });

      if (res.data?.success) {
        setIsTagModalOpen(false);
        await refreshSettingsAndLatest();

        setSelectedPumpId(String(newTag.pumpId));

        setTestResult({
          success: true,
          message: 'PLC tag mapping added successfully',
        });
      }
    } catch (err) {
      console.log('Failed to add PLC tag mapping:', err);

      setTestResult({
        success: false,
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to add PLC tag mapping',
      });
    } finally {
      setAddingTag(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setTestResult(null);

      const res = await API.post('/modbus/test', {
        host: form.host,
        port: Number(form.port),
        unitId: Number(form.unitId),
        timeout: Number(form.timeout),
        pollingInterval: Number(form.pollingInterval),
      });

      setTestResult({
        success: true,
        message: res.data.message || 'Modbus connected successfully',
      });

      await refreshLatestValues();
    } catch (err) {
      setTestResult({
        success: false,
        message:
          err?.response?.data?.message || 'Failed to connect Modbus device',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      setTestResult(null);

      if (!form.id) {
        setTestResult({
          success: false,
          message: 'No Modbus device found in database',
        });
        return;
      }

      const res = await API.put(`/db/devices/${form.id}`, {
        name: 'Main Pump PLC',
        host: form.host,
        port: Number(form.port),
        unit_id: Number(form.unitId),
        timeout_ms: Number(form.timeout),
        poll_interval_ms: Number(form.pollingInterval),
        is_enabled: form.isEnabled,
      });

      setTestResult({
        success: true,
        message: res.data.message || 'Modbus configuration saved to database',
      });

      await refreshSettingsAndLatest();
    } catch (err) {
      setTestResult({
        success: false,
        message:
          err?.response?.data?.message ||
          'Failed to save Modbus configuration',
      });
    } finally {
      setLoading(false);
    }
  };


  function openRenameUnitModal(pump) {
    setEditingUnit({
      id: pump.id,
      pumpName: pump.pump_name || '',
      pumpCode: pump.pump_code || '',
    });

    setIsRenameUnitOpen(true);
  }

  async function handleRenameUnit() {
    try {
      setSavingUnit(true);
      setTestResult(null);

      const res = await API.put(`/modbus/units/${editingUnit.id}`, {
        pumpName: editingUnit.pumpName,
        pumpCode: editingUnit.pumpCode,
      });

      if (res.data?.success) {
        setIsRenameUnitOpen(false);
        await refreshSettingsAndLatest();

        setTestResult({
          success: true,
          message: 'Pump unit updated successfully',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to update pump unit',
      });
    } finally {
      setSavingUnit(false);
    }
  }

  async function handleDisableUnit(pump) {
    const confirmed = window.confirm(
      `Disable ${pump.pump_name}? Tag mapping untuk pump ini juga akan dinonaktifkan.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setTestResult(null);

      const res = await API.delete(`/modbus/units/${pump.id}`);

      if (res.data?.success) {
        await refreshSettingsAndLatest();

        setTestResult({
          success: true,
          message: 'Pump unit disabled successfully',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to disable pump unit',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-4 xl:px-8">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Modbus TCP/IP Setting
          </h1>

          <p className="text-sm font-medium text-slate-500">
            Configure communication between backend and pump controller
          </p>
        </div>

        <div className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
          Setting
        </div>
      </div>

      <main className="grid flex-1 grid-cols-1 items-start gap-5 pb-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="h-fit rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Connection
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Set Modbus TCP host, port, unit ID, timeout, and polling interval.
          </p>

          <div className="mt-6 space-y-4">
            <InputField
              label="IP Address / Host"
              value={form.host}
              onChange={(value) => updateField('host', value)}
              placeholder="192.168.1.10"
            />

            <InputField
              label="Port"
              type="number"
              value={form.port}
              onChange={(value) => updateField('port', value)}
              placeholder="502"
            />

            <InputField
              label="Unit ID / Slave ID"
              type="number"
              value={form.unitId}
              onChange={(value) => updateField('unitId', value)}
              placeholder="1"
            />

            <InputField
              label="Timeout"
              type="number"
              value={form.timeout}
              onChange={(value) => updateField('timeout', value)}
              placeholder="3000"
              suffix="ms"
            />

            <InputField
              label="Polling Interval"
              type="number"
              value={form.pollingInterval}
              onChange={(value) => updateField('pollingInterval', value)}
              placeholder="1000"
              suffix="ms"
            />

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.isEnabled}
                onChange={(e) => updateField('isEnabled', e.target.checked)}
              />
              Enable Modbus Device
            </label>
          </div>

          {visibleConnectionResult && (
            <div
              className={
                visibleConnectionResult.success
                  ? 'mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700'
                  : 'mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700'
              }
            >
              {visibleConnectionResult.message}
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={testConnection}
              disabled={loading}
              className="h-11 rounded-xl bg-slate-800 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={saveConfig}
              disabled={loading}
              className="h-11 rounded-xl bg-blue-700 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Save Setting'}
            </button>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Power Units
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select one pump unit to edit network, live view, registers, and coils.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddUnitModal}
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Add Unit
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Host</th>
                  <th className="px-4 py-3">Registers</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pumps.map((pump) => {
                  const registerCount = tags.filter(
                    (tag) => String(tag.pump_id) === String(pump.id),
                  ).length;

                  const pumpConnectionStatus = getPumpConnectionStatus(pump.id);

                  return (
                    <tr key={pump.id}>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-900">
                          {pump.pump_name}
                        </div>
                        <div className="text-xs font-semibold text-slate-400">
                          {pump.pump_code}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {pump.device_name || 'Main Pump PLC'}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {pump.device_host || form.host || '-'}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-700">
                        {registerCount}
                      </td>

                      <td className="px-4 py-4">
                        <UnitStatusBadge connectionStatus={pumpConnectionStatus} />
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
  <button
    type="button"
    onClick={() => openEditor(pump.id, 'live')}
    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
  >
    Edit
  </button>

  <button
    type="button"
    onClick={() => openRenameUnitModal(pump)}
    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
  >
    Rename
  </button>

  <button
    type="button"
    onClick={() => handleDisableUnit(pump)}
    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
  >
    Disable
  </button>
</div>
                      </td>
                    </tr>
                  );
                })}

                {pumps.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-6 text-center text-sm font-semibold text-slate-400"
                    >
                      No pump unit found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-4">
            <InfoCard title="Connection Type" value="Modbus TCP/IP" />
            <InfoCard title="Default Port" value="502" />
            <InfoCard title="Pumps" value={pumps.length} />
            <InfoCard title="Tags" value={tags.length} />
          </div>
        </section>
      </main>

      {isEditorOpen && (
        <UnitConfigModal
          form={form}
          selectedPump={selectedPump}
          selectedPumpId={selectedPumpId}
          pumps={pumps}
          tags={selectedPumpTags}
          liveRows={liveRows}
          coilRows={coilRows}
          activeTab={activeTab}
          liveLoading={liveLoading}
          loading={loading}
          testResult={visibleConnectionResult}
          connectionStatus={selectedConnectionStatus}
          onTabChange={setActiveTab}
          onClose={() => setIsEditorOpen(false)}
          onSelectPump={setSelectedPumpId}
          onRefreshLive={refreshLatestValues}
          onTestConnection={testConnection}
          onSaveConfig={saveConfig}
          onUpdateField={updateField}
          onAddRegister={() => openAddTagModal('register')}
          onAddCoil={() => openAddTagModal('coil')}
        />
      )}

      {isAddUnitOpen && (
        <AddUnitModal
          value={newUnit}
          onChange={setNewUnit}
          loading={addingUnit}
          onClose={() => setIsAddUnitOpen(false)}
          onSubmit={handleAddUnit}
        />
      )}

      {isTagModalOpen && (
        <PlcTagModal
          type={tagModalType}
          pumps={pumps}
          value={newTag}
          onChange={setNewTag}
          loading={addingTag}
          onClose={() => setIsTagModalOpen(false)}
          onSubmit={handleAddTag}
        />
      )}
      {isRenameUnitOpen && (
  <RenameUnitModal
    value={editingUnit}
    onChange={setEditingUnit}
    loading={savingUnit}
    onClose={() => setIsRenameUnitOpen(false)}
    onSubmit={handleRenameUnit}
  />
)}
    </div>
  );
}

function UnitConfigModal({
  form,
  selectedPump,
  selectedPumpId,
  pumps,
  tags,
  liveRows,
  coilRows,
  activeTab,
  liveLoading,
  loading,
  testResult,
  connectionStatus,
  onTabChange,
  onClose,
  onSelectPump,
  onRefreshLive,
  onTestConnection,
  onSaveConfig,
  onUpdateField,
  onAddRegister,
  onAddCoil,
}) {
  const lastUpdate = liveRows
    .map((row) => row.updated_at)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-6 py-6">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-950">
            Edit Unit Config
          </h2>

          <p className="text-sm font-medium text-slate-500">
            Sinkron ke DB: network, live polling, register, dan coils/alarms.
          </p>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 px-6 pt-4">
          <TabButton
            active={activeTab === 'network'}
            onClick={() => onTabChange('network')}
            label="Network"
          />

          <TabButton
            active={activeTab === 'live'}
            onClick={() => onTabChange('live')}
            label="Live"
          />

          <TabButton
            active={activeTab === 'registers'}
            onClick={() => onTabChange('registers')}
            label="Registers"
          />

          <TabButton
            active={activeTab === 'coils'}
            onClick={() => onTabChange('coils')}
            label="Coils/Alarms"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
            <SelectField
              label="Select Unit"
              value={selectedPumpId}
              onChange={onSelectPump}
              options={pumps.map((pump) => ({
                value: String(pump.id),
                label: `${pump.pump_name} - ${pump.pump_code}`,
              }))}
            />

            <div className="rounded-xl bg-slate-50 p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-xs font-semibold uppercase text-slate-400">
          Selected Unit
        </div>

        <div className="mt-2 text-lg font-bold text-slate-950">
          {selectedPump?.pump_name || '-'}
        </div>

        <div className="text-sm font-semibold text-slate-500">
          {selectedPump?.pump_code || '-'}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <UnitStatusBadge connectionStatus={connectionStatus} />

        <button
          type="button"
          onClick={onRefreshLive}
          className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
        >
          {liveLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  </div>
          </div>

          {activeTab === 'network' && (
            <NetworkTab
              form={form}
              loading={loading}
              testResult={testResult}
              onUpdateField={onUpdateField}
              onTestConnection={onTestConnection}
              onSaveConfig={onSaveConfig}
            />
          )}

          {activeTab === 'live' && (
            <LiveTab
  form={form}
  liveRows={liveRows}
  lastUpdate={lastUpdate}
/>
          )}

          {activeTab === 'registers' && (
            <RegistersTab tags={tags} onAddRegister={onAddRegister} />
          )}

          {activeTab === 'coils' && (
            <CoilsTab coilRows={coilRows} onAddCoil={onAddCoil} />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>

          <div className="flex gap-3">
  <button
    type="button"
    onClick={onSaveConfig}
    className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800"
  >
    Save
  </button>
</div>
        </div>
      </div>
    </div>
  );
}

function NetworkTab({
  form,
  loading,
  testResult,
  onUpdateField,
  onTestConnection,
  onSaveConfig,
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-slate-950">Network</h3>

      <p className="mt-1 text-sm text-slate-500">
        Configure IP, port, unit ID, timeout, and polling interval.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField
          label="IP Address / Host"
          value={form.host}
          onChange={(value) => onUpdateField('host', value)}
          placeholder="192.168.1.10"
        />

        <InputField
          label="Port"
          type="number"
          value={form.port}
          onChange={(value) => onUpdateField('port', value)}
          placeholder="502"
        />

        <InputField
          label="Unit ID / Slave ID"
          type="number"
          value={form.unitId}
          onChange={(value) => onUpdateField('unitId', value)}
          placeholder="1"
        />

        <InputField
          label="Timeout"
          type="number"
          value={form.timeout}
          onChange={(value) => onUpdateField('timeout', value)}
          placeholder="3000"
          suffix="ms"
        />

        <InputField
          label="Polling Interval"
          type="number"
          value={form.pollingInterval}
          onChange={(value) => onUpdateField('pollingInterval', value)}
          placeholder="1000"
          suffix="ms"
        />

        <label className="flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.isEnabled}
            onChange={(e) => onUpdateField('isEnabled', e.target.checked)}
          />
          Enable Modbus Device
        </label>
      </div>

      {testResult && (
        <div
          className={
            testResult.success
              ? 'mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700'
              : 'mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700'
          }
        >
          {testResult.message}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onTestConnection}
          disabled={loading}
          className="h-10 rounded-xl bg-slate-800 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          type="button"
          onClick={onSaveConfig}
          disabled={loading}
          className="h-10 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Network'}
        </button>
      </div>
    </div>
  );
}

function LiveTab({
  form,
  liveRows,
  lastUpdate,
}) {
  const liveTagOrder = {
    status: 1,
    run_feedback: 2,
    remote: 3,
    vsd_run: 4,

    voltage: 10,
    current: 11,
    power: 12,
    frequency: 13,
    vsd_frequency: 14,

    speed: 20,
    speed_actual: 21,
    speed_ref: 22,

    run_hour: 30,
    vsd_run_hour: 31,

    kwh: 40,
    energy: 41,

    start: 50,
    start_command: 51,
    stop: 52,
    stop_command: 53,
  };

  const sortedLiveRows = [...liveRows].sort((a, b) => {
    const orderA = liveTagOrder[a.tagKey] || 99;
    const orderB = liveTagOrder[b.tagKey] || 99;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return String(a.tagKey).localeCompare(String(b.tagKey));
  });

  return (
    <div>
     <div className="mb-5">
  <h3 className="text-lg font-bold text-slate-950">
    Live Modbus
  </h3>

  <p className="mt-1 text-sm text-slate-500">
    Data realtime dari server polling Modbus.
  </p>
</div>
      <div className="mb-5 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
        <div>
          <div className="font-bold text-slate-950">Unit ID</div>
          <div className="font-semibold text-slate-500">
            device_1
          </div>
        </div>

        <div>
          <div className="font-bold text-slate-950">IP</div>
          <div className="font-semibold text-slate-500">
            {form.host}:{form.port} / Slave {form.unitId}
          </div>
        </div>

        <div>
          <div className="font-bold text-slate-950">Last Data</div>
          <div className="font-semibold text-slate-500">
            {lastUpdate ? new Date(lastUpdate).toLocaleString() : '-'}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Quality</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedLiveRows.map((row) => (
              <tr key={row.tagKey}>
                <td className="px-4 py-3 font-semibold text-slate-700">
                  {row.tagKey}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {row.label}
                </td>

                <td className="px-4 py-3 font-bold text-slate-950">
                  {row.value_text ?? row.value_number ?? '-'}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {row.unit || '-'}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={
                      row.quality === 'good'
                        ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700'
                        : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700'
                    }
                  >
                    {row.quality || '-'}
                  </span>
                </td>
              </tr>
            ))}

            {sortedLiveRows.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-6 text-center text-sm font-semibold text-slate-400"
                >
                  No live data found for this unit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegistersTab({ tags, onAddRegister }) {
  const sortedTags = [...tags].sort((a, b) => {
    const kindOrder = {
      holding_register: 1,
      input_register: 2,
      coil: 3,
      discrete_input: 4,
    };

    const orderA = kindOrder[a.register_type] || 99;
    const orderB = kindOrder[b.register_type] || 99;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return Number(a.register_address || 0) - Number(b.register_address || 0);
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            Registers
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Register mapping for selected unit only.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddRegister}
          className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Add Register
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">PLC Address</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Addr</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Read FC</th>
              <th className="px-4 py-3">Write FC</th>
              <th className="px-4 py-3">Unit</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedTags.map((tag) => (
              <tr key={tag.id}>
                <td className="px-4 py-3 font-semibold text-slate-700">
                  {tag.tag_key}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.label}
                </td>

                <td className="px-4 py-3 font-bold text-slate-900">
                  {tag.plc_address || '-'}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.register_type}
                </td>

                <td className="px-4 py-3 font-bold text-slate-900">
                  {tag.register_address}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.quantity}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.data_type}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.read_function_code || '-'}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.write_function_code || '-'}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.unit || '-'}
                </td>
              </tr>
            ))}

            {sortedTags.length === 0 && (
              <tr>
                <td
                  colSpan="10"
                  className="px-4 py-6 text-center text-sm font-semibold text-slate-400"
                >
                  No register mapping found for this unit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoilsTab({ coilRows, onAddCoil }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            Coils / Alarms
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Coil command and alarm/fault mapping for selected unit only.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddCoil}
          className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Add Coil
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Addr</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Writable</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {coilRows.map((tag) => (
              <tr key={tag.id}>
                <td className="px-4 py-3 font-semibold text-slate-700">
                  {tag.tag_key}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.label}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.register_type}
                </td>

                <td className="px-4 py-3 font-bold text-slate-900">
                  {tag.register_address}
                </td>

                <td className="px-4 py-3 text-slate-600">
                  {tag.data_type}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={
                      Number(tag.is_writable) === 1
                        ? 'rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700'
                        : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500'
                    }
                  >
                    {Number(tag.is_writable) === 1 ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}

            {coilRows.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="px-4 py-6 text-center text-sm font-semibold text-slate-400"
                >
                  No coil or alarm mapping found for this unit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddUnitModal({ value, onChange, loading, onClose, onSubmit }) {
  const updateField = (field, fieldValue) => {
    onChange((prev) => ({
      ...prev,
      [field]: fieldValue,
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-950">
            Add Pump Unit
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Tambahkan unit pompa baru ke database monitoring.
          </p>
        </div>

        <div className="space-y-4">
          <InputField
            label="Unit Name"
            value={value.pumpName}
            onChange={(nextValue) => updateField('pumpName', nextValue)}
            placeholder="Contoh: Amacan 4"
          />

          <InputField
            label="Unit Code"
            value={value.pumpCode}
            onChange={(nextValue) => updateField('pumpCode', nextValue)}
            placeholder="Contoh: PUMP_5"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !String(value.pumpName).trim()}
            className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Add Unit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlcTagModal({
  type,
  pumps,
  value,
  onChange,
  loading,
  onClose,
  onSubmit,
}) {
  const isCoil = type === 'coil';

  const updateField = (field, fieldValue) => {
    onChange((prev) => ({
      ...prev,
      [field]: fieldValue,
    }));
  };

  const updatePlcAddress = (nextValue) => {
    onChange((prev) => {
      const parsedAddress = parseRegisterAddressFromText(nextValue);
      const shouldFillRegisterAddress =
        !String(prev.registerAddress || '').trim() && parsedAddress !== '';

      return {
        ...prev,
        plcAddress: nextValue,
        registerAddress: shouldFillRegisterAddress
          ? parsedAddress
          : prev.registerAddress,
      };
    });
  };

  const updateRegisterType = (nextValue) => {
    onChange((prev) => {
      const nextIsBool = nextValue === 'coil' || nextValue === 'discrete_input';

      return {
        ...prev,
        registerType: nextValue,
        dataType: nextIsBool ? 'bool' : prev.dataType === 'bool' ? 'uint16' : prev.dataType,
        quantity: nextIsBool ? 1 : prev.quantity,
        isWritable:
          nextValue === 'discrete_input' || nextValue === 'input_register'
            ? false
            : prev.isWritable,
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-950">
            {isCoil ? 'Add Coil Mapping' : 'Add Register Mapping'}
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Mapping ini hanya mendaftarkan alamat PLC yang sudah ada di ladder.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField
            label="Pump Unit"
            value={String(value.pumpId)}
            onChange={(nextValue) => updateField('pumpId', nextValue)}
            options={pumps.map((pump) => ({
              value: String(pump.id),
              label: `${pump.pump_name} - ${pump.pump_code}`,
            }))}
          />

          <InputField
            label="Tag Key"
            value={value.tagKey}
            onChange={(nextValue) => updateField('tagKey', nextValue)}
            placeholder={isCoil ? 'vsd_run' : 'power'}
          />

          <InputField
            label="Label"
            value={value.label}
            onChange={(nextValue) => updateField('label', nextValue)}
            placeholder={isCoil ? 'VSD Run Feedback' : 'Power VSD'}
          />

          <InputField
            label="PLC Address"
            value={value.plcAddress}
            onChange={updatePlcAddress}
            placeholder={isCoil ? '%M104' : '%MW100'}
          />

          <InputField
            label="Register Address"
            type="number"
            value={value.registerAddress}
            onChange={(nextValue) => updateField('registerAddress', nextValue)}
            placeholder={isCoil ? '104' : '100'}
          />

          <SelectField
            label="Register Type"
            value={value.registerType}
            onChange={updateRegisterType}
            options={
              isCoil
                ? [
                    { value: 'coil', label: 'Coil / %M' },
                    { value: 'discrete_input', label: 'Discrete Input' },
                  ]
                : [
                    { value: 'holding_register', label: 'Holding Register / %MW' },
                    { value: 'input_register', label: 'Input Register' },
                  ]
            }
          />

          <SelectField
            label="Data Type"
            value={value.dataType}
            onChange={(nextValue) => updateField('dataType', nextValue)}
            options={
              isCoil
                ? [{ value: 'bool', label: 'Bool' }]
                : [
                    { value: 'uint16', label: 'UInt16' },
                    { value: 'int16', label: 'Int16' },
                    { value: 'uint32', label: 'UInt32' },
                    { value: 'int32', label: 'Int32' },
                  ]
            }
          />

          <InputField
            label="Quantity"
            type="number"
            value={value.quantity}
            onChange={(nextValue) => updateField('quantity', nextValue)}
            placeholder="1"
          />

          {!isCoil && (
            <>
              <InputField
                label="Unit"
                value={value.unit}
                onChange={(nextValue) => updateField('unit', nextValue)}
                placeholder="kW / A / V / Hz"
              />

              <InputField
                label="Scale"
                type="number"
                value={value.scaleValue}
                onChange={(nextValue) => updateField('scaleValue', nextValue)}
                placeholder="1"
              />

              <InputField
                label="Offset"
                type="number"
                value={value.offsetValue}
                onChange={(nextValue) => updateField('offsetValue', nextValue)}
                placeholder="0"
              />
            </>
          )}

          <label className="flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(value.isReadable)}
              onChange={(e) => updateField('isReadable', e.target.checked)}
            />
            Readable
          </label>

          <label className="flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(value.isWritable)}
              onChange={(e) => updateField('isWritable', e.target.checked)}
            />
            Writable / Command
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(value.isEnabled)}
              onChange={(e) => updateField('isEnabled', e.target.checked)}
            />
            Enabled
          </label>
        </div>

        {Boolean(value.isWritable) && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            Hati-hati: Writable tag bisa menulis ke PLC. Pastikan alamat ini memang command di ladder PLC.
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={
              loading ||
              !value.pumpId ||
              !String(value.tagKey).trim() ||
              !String(value.label).trim()
            }
            className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save Mapping'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnitStatusBadge({ connectionStatus }) {
  if (connectionStatus === 'connected') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
        Connected
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
      Disconnected
    </span>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'border-b-2 border-blue-700 px-4 py-3 text-sm font-bold text-blue-700'
          : 'border-b-2 border-transparent px-4 py-3 text-sm font-bold text-slate-500 transition hover:text-slate-900'
      }
    >
      {label}
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  suffix,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <div className="flex h-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-slate-800 outline-none"
        />

        {suffix && (
          <div className="flex h-full items-center px-4 text-xs font-bold text-slate-400">
            {suffix}
          </div>
        )}
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
      >
        {options.length === 0 && <option value="">No data</option>}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoCard({ title, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase text-slate-400">
        {title}
      </div>

      <div className="mt-2 text-lg font-bold text-slate-950">
        {value}
      </div>
    </div>
  );
}

function parseRegisterAddressFromText(value) {
  const text = String(value || '').trim().toUpperCase();
  const match = text.match(/%M(?:W)?(\d+)/);

  if (match) {
    return match[1];
  }

  const numberMatch = text.match(/\d+/);

  return numberMatch ? numberMatch[0] : '';
}



function RenameUnitModal({
  value,
  onChange,
  loading,
  onClose,
  onSubmit,
}) {
  const updateField = (field, fieldValue) => {
    onChange((prev) => ({
      ...prev,
      [field]: fieldValue,
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-950">
            Rename Pump Unit
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Ubah nama dan kode unit pompa.
          </p>
        </div>

        <div className="space-y-4">
          <InputField
            label="Unit Name"
            value={value.pumpName}
            onChange={(nextValue) => updateField('pumpName', nextValue)}
            placeholder="Contoh: Amacan 4"
          />

          <InputField
            label="Unit Code"
            value={value.pumpCode}
            onChange={(nextValue) => updateField('pumpCode', nextValue)}
            placeholder="Contoh: PUMP_5"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !String(value.pumpName).trim()}
            className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}