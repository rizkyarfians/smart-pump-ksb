import { useEffect, useState } from 'react';

import API from '../services/api';
import DashboardGrid from '../components/dashboard/DashboardGrid';

import { FALLBACK_PUMPS } from '../data/dashboardData';

export default function Dashboard() {
  const [pumps, setPumps] = useState([]);

  useEffect(() => {
    let active = true;

    const fetchPumps = async () => {
      try {
        const res = await API.get('/db/latest-values');

        const mappedPumps = mapLatestValuesToDashboard(res.data?.data || []);

        if (active) {
          setPumps(mappedPumps);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchPumps();

    const interval = setInterval(() => {
      fetchPumps();
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const pumpCards = pumps.length > 0 ? pumps : FALLBACK_PUMPS;

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-4 xl:px-8">
      <DashboardGrid pumps={pumpCards} />
    </div>
  );
}

function mapLatestValuesToDashboard(apiPumps) {
  return apiPumps.map((pump, index) => {
    const values = pump.values || {};

    const runningRow = findRunStatusValue(values);
    const isRunning = toBool(runningRow?.value);

    const remoteValue = getValue(values, 'remote');
    const isRemote = toBool(remoteValue);

    const activeAlarms = getActiveAlarms(values);
    const hasAlarm = activeAlarms.length > 0;

    const voltage = getValue(values, 'voltage');
    const current = getValue(values, 'current');
    const power = getValue(values, 'power');
    const frequency =
      getValue(values, 'frequency') ?? getValue(values, 'vsd_frequency');

    const speedActual =
      getValue(values, 'speed') ?? getValue(values, 'speed_actual');

    const speedRef = getValue(values, 'speed_ref');
    const energy = getValue(values, 'kwh');

    return {
      // Identity
      id: pump.id,
      pumpId: pump.id,
      number: index + 1,
      no: index + 1,

      pump_code: pump.pump_code,
      pump_name: pump.pump_name,

      // Aliases for old dashboard components
      code: pump.pump_code,
      name: pump.pump_name,
      title: pump.pump_name,
      label: pump.pump_name,

      // Mode
      mode: remoteValue === null ? 'Unknown' : isRemote ? 'Auto' : 'Manual',

      // Run hour
      runHour:
        getValue(values, 'vsd_run_hour') ??
        getValue(values, 'run_hour') ??
        '-',

      // Alarm
      hasAlarm,
      alarm: hasAlarm,
      activeAlarms,
      alarmText: hasAlarm
        ? activeAlarms.map((item) => item.label).join(', ')
        : '',

      // Status dari source yang sama dengan Pump Details
      status: hasAlarm ? 'Alarm' : isRunning ? 'Running' : 'Stopped',
      statusText: hasAlarm ? 'Alarm' : isRunning ? 'Running' : 'Stopped',
      statusRaw: runningRow?.value ?? null,
      runSource: runningRow?.label || runningRow?.key || null,

      isRunning,
      running: isRunning,
      online: true,

      // Main monitoring values
      voltage,
      current,
      power,
      frequency,
      speedActual,
      speedRef,
      energy,

      // Extra aliases
      volt: voltage,
      ampere: current,
      amp: current,
      kw: power,
      hz: frequency,
      rpm: speedActual,
      speed: speedActual,
      actualSpeed: speedActual,
      referenceSpeed: speedRef,
      setSpeed: speedRef,
      kwh: energy,

      // Units
      voltageUnit: getUnit(values, 'voltage') || 'V',
      currentUnit: getUnit(values, 'current') || 'A',
      powerUnit: getUnit(values, 'power') || 'kW',
      frequencyUnit:
        getUnit(values, 'frequency') ||
        getUnit(values, 'vsd_frequency') ||
        'Hz',
      speedActualUnit:
        getUnit(values, 'speed') ||
        getUnit(values, 'speed_actual') ||
        'RPM',
      speedRefUnit: getUnit(values, 'speed_ref') || 'RPM',
      energyUnit: getUnit(values, 'kwh') || 'kWh',

      // Last update
      lastUpdate: getLastUpdate(values),

      // Keep original data
      values,
      rawValues: values,
    };
  });
}

function findRunStatusValue(values) {
  const keys = [
    'vsd_run',
    'run_feedback',
    'run_status',
    'running',
    'motor_run',
    'pump_run',
    'status',
    'run',
    'start',
    'start_command',
    'start_cmd',
  ];

  const labelKeywords = [
    'vsd run',
    'run feedback',
    'running',
    'motor run',
    'pump run',
    'run status',
    'remote cmd',
    'start',
  ];

  const excludeKeywords = [
    'run hour',
    'hour',
    'runtime',
    'reff',
    'ref',
    'reference',
    'speed',
  ];

  for (const key of keys) {
    const item = values?.[key];

    if (!item) continue;

    const labelText = String(item.label || '').toLowerCase();
    const keyText = String(key || '').toLowerCase();

    const excluded = excludeKeywords.some((keyword) => {
      const keywordText = String(keyword).toLowerCase();

      return labelText.includes(keywordText) || keyText.includes(keywordText);
    });

    if (!excluded) {
      return {
        key,
        label: item.label || key,
        value: item.value_text ?? item.value_number ?? item.raw_value ?? null,
      };
    }
  }

  const entries = Object.entries(values || {});

  for (const [key, item] of entries) {
    const labelText = String(item?.label || '').toLowerCase();
    const keyText = String(key || '').toLowerCase();

    const excluded = excludeKeywords.some((keyword) => {
      const keywordText = String(keyword).toLowerCase();

      return labelText.includes(keywordText) || keyText.includes(keywordText);
    });

    if (excluded) continue;

    const matched = labelKeywords.some((keyword) => {
      const keywordText = String(keyword).toLowerCase();

      return labelText.includes(keywordText) || keyText.includes(keywordText);
    });

    if (matched) {
      return {
        key,
        label: item.label || key,
        value: item.value_text ?? item.value_number ?? item.raw_value ?? null,
      };
    }
  }

  return null;
}

function getValue(values, key) {
  const item = values?.[key];

  if (!item) return null;

  return item.value_text ?? item.value_number ?? item.raw_value ?? null;
}

function getUnit(values, key) {
  return values?.[key]?.unit || '';
}

function getLastUpdate(values) {
  const dates = Object.values(values || {})
    .map((item) => item.updated_at)
    .filter(Boolean);

  if (dates.length === 0) return null;

  return dates.sort().reverse()[0];
}

const ALARM_TAGS = [
  { key: 'vsd_alarm', label: 'VSD Alarm' },
  { key: 'bimetal', label: 'Bimetal / Overload' },
  { key: 'emg', label: 'Emergency Stop' },
  { key: 'emergency', label: 'Emergency Stop' },
  { key: 'fault', label: 'Fault' },
  { key: 'alarm', label: 'Alarm' },
];

function getActiveAlarms(values) {
  return ALARM_TAGS.filter((alarm) => toBool(getValue(values, alarm.key)));
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
    text === 'auto' ||
    text === 'remote' ||
    text === 'running' ||
    text === 'run' ||
    text === 'start' ||
    text === 'started'
  ) {
    return true;
  }

  if (
    text === '0' ||
    text === 'false' ||
    text === 'off' ||
    text === 'manual' ||
    text === 'local' ||
    text === 'stopped' ||
    text === 'stop' ||
    text === ''
  ) {
    return false;
  }

  return false;
}