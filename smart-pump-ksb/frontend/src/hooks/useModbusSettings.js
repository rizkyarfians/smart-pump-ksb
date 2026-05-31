import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  addPlcTag,
  addPumpUnit,
  deletePumpUnit,
  disablePumpUnit,
  fetchLatestModbusValues,
  fetchModbusSettingsData,
  setPlcTagContactType,
  setPlcTagEnabled,
  testModbusConnection,
  updateModbusDevice,
  updatePlcTag,
  updatePumpUnit,
} from '../services/modbusSettingsApi';

import { DEFAULT_FORM, DEFAULT_TAG_FORM } from '../constants/modbusDefaults';

export default function useModbusSettings() {
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
  const [tagModalMode, setTagModalMode] = useState('add');
  const [editingTagId, setEditingTagId] = useState(null);
  const [newTag, setNewTag] = useState(DEFAULT_TAG_FORM);
  const [addingTag, setAddingTag] = useState(false);

  const [isRenameUnitOpen, setIsRenameUnitOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState({
    id: '',
    pumpName: '',
    pumpCode: '',
  });
  const [savingUnit, setSavingUnit] = useState(false);

  const [pendingSettingAction, setPendingSettingAction] = useState(null);
  const [settingPin, setSettingPin] = useState('');
  const [settingPinError, setSettingPinError] = useState('');
  const [settingPinLoading, setSettingPinLoading] = useState(false);

  const fetchAllData = useCallback(async ({ cancelled } = {}) => {
    try {
      const {
        devices,
        pumps: pumpData,
        tags: tagData,
        latestValues: latestData,
      } = await fetchModbusSettingsData();

      if (cancelled?.()) return;

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
      } else {
        setSelectedPumpId('');
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      await fetchAllData({ cancelled: () => cancelled });
    }, 0);

    const interval = setInterval(async () => {
      try {
        const latestData = await fetchLatestModbusValues();

        if (!cancelled) {
          setLatestValues(latestData);
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
  }, [fetchAllData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

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
        dataType === 'boolean' ||
        tagKey.includes('alarm') ||
        tagKey.includes('fault') ||
        tagKey.includes('remote') ||
        tagKey.includes('run') ||
        tagKey.includes('start') ||
        tagKey.includes('stop') ||
        tagKey.includes('reset')
      );
    });
  }, [selectedPumpTags]);

  const getPumpConnectionStatus = useCallback(
    (pumpId) => {
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
    },
    [latestValues, currentTimeMs, form.pollingInterval],
  );

  const selectedConnectionStatus = useMemo(() => {
    return getPumpConnectionStatus(selectedPumpId);
  }, [getPumpConnectionStatus, selectedPumpId]);

  const isAnyPumpConnected = useMemo(() => {
    return pumps.some(
      (pump) => getPumpConnectionStatus(pump.id) === 'connected',
    );
  }, [pumps, getPumpConnectionStatus]);

  const visibleConnectionResult = isAnyPumpConnected
    ? {
        success: true,
        message: 'Modbus polling connected',
      }
    : testResult;

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const refreshLatestValues = useCallback(async () => {
    try {
      setLiveLoading(true);

      const latestData = await fetchLatestModbusValues();

      setLatestValues(latestData);
    } catch (err) {
      console.log(err);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const refreshSettingsAndLatest = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  const openEditor = useCallback((pumpId, tab = 'live') => {
    setSelectedPumpId(String(pumpId));
    setActiveTab(tab);
    setIsEditorOpen(true);
  }, []);

  const openAddUnitModal = useCallback(() => {
    setNewUnit({
      pumpName: '',
      pumpCode: '',
    });

    setIsAddUnitOpen(true);
  }, []);

  const handleAddUnit = useCallback(async () => {
    try {
      setAddingUnit(true);
      setTestResult(null);

      const res = await addPumpUnit({
        pumpName: newUnit.pumpName,
        pumpCode: newUnit.pumpCode,
        deviceId: form.id || 1,
      });

      if (res?.success) {
        const insertedPump = res?.data;

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
  }, [newUnit, form.id, refreshSettingsAndLatest]);

  const openAddTagModal = useCallback(
    (type = 'register') => {
      const isCoil = type === 'coil';
      const pumpId = selectedPumpId || pumps[0]?.id || '';

      setTagModalMode('add');
      setEditingTagId(null);
      setTagModalType(type);

      setNewTag({
  ...DEFAULT_TAG_FORM,
  pumpId: String(pumpId),

  registerType: isCoil ? 'coil' : 'holding_register',
  dataType: isCoil ? 'bool' : 'float32',
  quantity: isCoil ? 1 : 2,

  unit: '',
  scaleValue: 1,
  offsetValue: 0,

  contactType: 'NO',
  byteOrder: 'ABCD',
  wordOrder: 'ABCD',

  isReadable: true,
  isWritable: false,
  isEnabled: true,
});

      setIsTagModalOpen(true);
    },
    [selectedPumpId, pumps],
  );

  const openEditTagModal = useCallback((tag) => {
    const registerType = String(tag.register_type || '').toLowerCase();
    const dataType = String(tag.data_type || '').toLowerCase();

    const isCoil =
      registerType === 'coil' ||
      registerType === 'discrete_input' ||
      dataType === 'bool' ||
      dataType === 'boolean';

    setTagModalMode('edit');
    setEditingTagId(tag.id);
    setTagModalType(isCoil ? 'coil' : 'register');

    setNewTag({
  pumpId: String(tag.pump_id || ''),
  tagKey: tag.tag_key || '',
  label: tag.label || '',
  plcAddress: tag.plc_address || '',
  registerAddress: tag.register_address ?? '',
  registerType: tag.register_type || (isCoil ? 'coil' : 'holding_register'),
  dataType: tag.data_type || (isCoil ? 'bool' : 'float32'),
  quantity: tag.quantity || (isCoil ? 1 : 2),
  unit: tag.unit || '',
  scaleValue: tag.scale_value ?? 1,
  offsetValue: tag.offset_value ?? 0,

  contactType: tag.contact_type || tag.contactType || 'NO',
  byteOrder: tag.byte_order || tag.byteOrder || 'ABCD',
  wordOrder: tag.word_order || tag.wordOrder || 'ABCD',

  isReadable: Number(tag.is_readable) === 1,
  isWritable: Number(tag.is_writable) === 1,
  isEnabled: Number(tag.is_enabled) === 1,
});
    setIsTagModalOpen(true);
  }, []);

  const buildTagPayload = useCallback(
  (operatorPin = '') => ({
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
    scaleValue: Number(newTag.scaleValue ?? 1),
    offsetValue: Number(newTag.offsetValue ?? 0),

    contactType: newTag.contactType || 'NO',
    byteOrder: newTag.byteOrder || 'ABCD',
    wordOrder: newTag.wordOrder || 'ABCD',

    isReadable: Boolean(newTag.isReadable),
    isWritable: Boolean(newTag.isWritable),
    isEnabled: Boolean(newTag.isEnabled),
    operatorPin,
  }),
  [newTag, form.id],
);

  const saveTagWithPin = useCallback(
    async (operatorPin) => {
      const payload = buildTagPayload(operatorPin);

      const res =
        tagModalMode === 'edit' && editingTagId
          ? await updatePlcTag(editingTagId, payload)
          : await addPlcTag(payload);

      if (!res?.success) {
        throw new Error(res?.message || 'Failed to save PLC tag mapping');
      }

      const wasEdit = tagModalMode === 'edit';

      setIsTagModalOpen(false);
      setEditingTagId(null);
      setTagModalMode('add');

      await refreshSettingsAndLatest();

      setSelectedPumpId(String(newTag.pumpId));

      setTestResult({
        success: true,
        message: wasEdit
          ? 'PLC tag mapping updated successfully'
          : 'PLC tag mapping added successfully',
      });
    },
    [
      buildTagPayload,
      tagModalMode,
      editingTagId,
      refreshSettingsAndLatest,
      newTag.pumpId,
    ],
  );

  const openSettingAction = useCallback((actionConfig) => {
    setPendingSettingAction(actionConfig);
    setSettingPin('');
    setSettingPinError('');
  }, []);

  const openSaveTagPinModal = useCallback(() => {
    if (
      !newTag.pumpId ||
      !String(newTag.tagKey).trim() ||
      !String(newTag.label).trim() ||
      !String(newTag.plcAddress).trim() ||
      !String(newTag.registerAddress).trim()
    ) {
      setTestResult({
        success: false,
        message: 'Lengkapi Pump, Tag Key, Label, PLC Address, dan Register Address terlebih dahulu',
      });

      return;
    }

    const isEdit = tagModalMode === 'edit';

    openSettingAction({
      title: isEdit ? 'Confirm Edit Mapping' : 'Confirm Add Mapping',
      description: isEdit
        ? 'Masukkan PIN untuk menyimpan perubahan mapping PLC.'
        : 'Masukkan PIN untuk menambahkan mapping PLC baru.',
      onConfirm: saveTagWithPin,
    });
  }, [newTag, tagModalMode, openSettingAction, saveTagWithPin]);

  const cancelSettingAction = useCallback(() => {
    if (settingPinLoading) return;

    setPendingSettingAction(null);
    setSettingPin('');
    setSettingPinError('');
  }, [settingPinLoading]);

  const confirmSettingAction = useCallback(async () => {
    if (!pendingSettingAction?.onConfirm) return;

    const cleanPin = String(settingPin || '').trim();

    if (!cleanPin) {
      setSettingPinError('PIN wajib diisi');
      return;
    }

    try {
      setSettingPinLoading(true);
      setSettingPinError('');
      setAddingTag(true);

      await pendingSettingAction.onConfirm(cleanPin);

      setPendingSettingAction(null);
      setSettingPin('');
      setSettingPinError('');
    } catch (err) {
      console.log('Setting action failed:', err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'PIN salah atau gagal menjalankan aksi';

      setSettingPinError(message);
      setTestResult({
        success: false,
        message,
      });
    } finally {
      setAddingTag(false);
      setSettingPinLoading(false);
    }
  }, [pendingSettingAction, settingPin]);

  const handleSaveTag = saveTagWithPin;
  const handleAddTag = openSaveTagPinModal;

  const toggleTagEnabledWithPin = useCallback(
  async (tag, operatorPin) => {
    const nextEnabled = Number(tag.is_enabled) !== 1;

    const res = await setPlcTagEnabled(tag.id, nextEnabled, operatorPin);

    if (!res?.success) {
      throw new Error(res?.message || 'Failed to update PLC tag status');
    }

    await refreshSettingsAndLatest();

    setTestResult({
      success: true,
      message: nextEnabled
        ? 'PLC tag enabled successfully'
        : 'PLC tag disabled successfully',
    });
  },
  [refreshSettingsAndLatest],
);

const handleToggleTagEnabled = useCallback(
  (tag) => {
    const enabled = Number(tag.is_enabled) === 1;

    openSettingAction({
      title: enabled ? 'Confirm Disable Mapping' : 'Confirm Enable Mapping',
      description: enabled
        ? `Masukkan PIN untuk menonaktifkan mapping "${tag.tag_key}".`
        : `Masukkan PIN untuk mengaktifkan mapping "${tag.tag_key}".`,
      onConfirm: (operatorPin) => toggleTagEnabledWithPin(tag, operatorPin),
    });
  },
  [openSettingAction, toggleTagEnabledWithPin],
);

  const testConnection = useCallback(async () => {
    try {
      setLoading(true);
      setTestResult(null);

      const res = await testModbusConnection({
        host: form.host,
        port: Number(form.port),
        unitId: Number(form.unitId),
        timeout: Number(form.timeout),
        pollingInterval: Number(form.pollingInterval),
      });

      setTestResult({
        success: Boolean(res?.success),
        message:
          res?.message ||
          (res?.success
            ? 'Modbus connected successfully'
            : 'Failed to connect Modbus device'),
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
  }, [form, refreshLatestValues]);

  const saveConfig = useCallback(async () => {
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

      const res = await updateModbusDevice(form.id, {
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
        message: res?.message || 'Modbus configuration saved to database',
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
  }, [form, refreshSettingsAndLatest]);

  const openRenameUnitModal = useCallback((pump) => {
    setEditingUnit({
      id: pump.id,
      pumpName: pump.pump_name || '',
      pumpCode: pump.pump_code || '',
    });

    setIsRenameUnitOpen(true);
  }, []);

  const handleRenameUnit = useCallback(async () => {
    try {
      setSavingUnit(true);
      setTestResult(null);

      const res = await updatePumpUnit(editingUnit.id, {
        pumpName: editingUnit.pumpName,
        pumpCode: editingUnit.pumpCode,
      });

      if (res?.success) {
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
  }, [editingUnit, refreshSettingsAndLatest]);

//   const disableUnitWithPin = useCallback(
//   async (pump, operatorPin) => {
//     const res = await disablePumpUnit(pump.id, operatorPin);

//     if (!res?.success) {
//       throw new Error(res?.message || 'Failed to disable pump unit');
//     }

//     await refreshSettingsAndLatest();

//     setTestResult({
//       success: true,
//       message: 'Pump unit disabled successfully',
//     });
//   },
//   [refreshSettingsAndLatest],
// );

const disableUnitWithPin = useCallback(
  async (pump, operatorPin) => {
    const res = await disablePumpUnit(pump.id, operatorPin);

    if (!res?.success) {
      throw new Error(res?.message || 'Failed to disable pump unit');
    }

    await refreshSettingsAndLatest();

    setTestResult({
      success: true,
      message: 'Pump unit disabled successfully',
    });
  },
  [refreshSettingsAndLatest],
);

const handleDisableUnit = useCallback(
  (pump) => {
    openSettingAction({
      title: 'Confirm Disable Unit',
      description: `Masukkan PIN untuk menonaktifkan unit "${pump.pump_name}". Semua tag mapping unit ini juga akan dinonaktifkan.`,
      onConfirm: (operatorPin) => disableUnitWithPin(pump, operatorPin),
    });
  },
  [openSettingAction, disableUnitWithPin],
);

  const handleEnableUnit = useCallback(() => {
    setTestResult({
      success: false,
      message: 'Enable unit endpoint belum disambungkan.',
    });
  }, []);


const deleteUnitWithPin = useCallback(
  async (pump, operatorPin) => {
    const res = await deletePumpUnit(pump.id, operatorPin);

    if (!res?.success) {
      throw new Error(res?.message || 'Failed to delete pump unit');
    }

    await refreshSettingsAndLatest();

    setTestResult({
      success: true,
      message: 'Pump unit deleted successfully',
    });
  },
  [refreshSettingsAndLatest],
);

const handleDeleteUnit = useCallback(
  (pump) => {
    openSettingAction({
      title: 'Confirm Delete Unit',
      description: `Masukkan PIN untuk menghapus permanen unit "${pump.pump_name}". Data unit dan tag mapping-nya akan dihapus.`,
      onConfirm: (operatorPin) => deleteUnitWithPin(pump, operatorPin),
    });
  },
  [openSettingAction, deleteUnitWithPin],
);
const toggleContactTypeWithPin = useCallback(
  async (tag, operatorPin) => {
    const currentContactType = String(
      tag.contact_type || tag.contactType || 'NO',
    ).toUpperCase();

    const nextContactType = currentContactType === 'NC' ? 'NO' : 'NC';

    const res = await setPlcTagContactType(
      tag.id,
      nextContactType,
      operatorPin,
    );

    if (!res?.success) {
      throw new Error(res?.message || 'Failed to update contact type');
    }

    await refreshSettingsAndLatest();

    setTestResult({
      success: true,
      message: `Contact type ${tag.tag_key} berhasil diubah ke ${nextContactType}`,
    });
  },
  [refreshSettingsAndLatest],
);

const handleToggleContactType = useCallback(
  (tag) => {
    const currentContactType = String(
      tag.contact_type || tag.contactType || 'NO',
    ).toUpperCase();

    const nextContactType = currentContactType === 'NC' ? 'NO' : 'NC';

    openSettingAction({
      title: 'Confirm Contact Type Change',
      description: `Masukkan PIN untuk mengubah contact type "${tag.tag_key}" dari ${currentContactType} ke ${nextContactType}.`,
      onConfirm: (operatorPin) =>
        toggleContactTypeWithPin(tag, operatorPin),
    });
  },
  [openSettingAction, toggleContactTypeWithPin],
);

  return {
    form,
    pumps,
    tags,
    latestValues,

    selectedPumpId,
    setSelectedPumpId,
    selectedPump,
    selectedPumpTags,
    liveRows,
    coilRows,

    isEditorOpen,
    setIsEditorOpen,
    activeTab,
    setActiveTab,

    testResult,
    visibleConnectionResult,
    loading,
    liveLoading,

    selectedConnectionStatus,
    getPumpConnectionStatus,

    isAddUnitOpen,
    setIsAddUnitOpen,
    newUnit,
    setNewUnit,
    addingUnit,

    isTagModalOpen,
    setIsTagModalOpen,
    tagModalType,
    tagModalMode,
    editingTagId,
    newTag,
    setNewTag,
    addingTag,

    isRenameUnitOpen,
    setIsRenameUnitOpen,
    editingUnit,
    setEditingUnit,
    savingUnit,

    pendingSettingAction,
    settingPin,
    setSettingPin,
    settingPinError,
    settingPinLoading,
    cancelSettingAction,
    confirmSettingAction,

    updateField,
    refreshLatestValues,
    refreshSettingsAndLatest,

    openEditor,

    openAddUnitModal,
    handleAddUnit,

    openAddTagModal,
    openEditTagModal,
    openSaveTagPinModal,
    handleSaveTag,
    handleAddTag,
    handleToggleTagEnabled,
handleToggleContactType,

    testConnection,
    saveConfig,

    openRenameUnitModal,
    handleRenameUnit,
    handleDisableUnit,
    handleEnableUnit,
    handleDeleteUnit,
  };
}