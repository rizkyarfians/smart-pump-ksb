import { useEffect, useMemo, useState } from 'react';

import API from '../services/api';

export default function PumpDetails() {
  const [pumps, setPumps] = useState([]);
  const [tags, setTags] = useState([]);
  const [latestValues, setLatestValues] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refreshLatestValues(active = true) {
    try {
      const res = await API.get('/db/latest-values');

      if (!active) return;

      setLatestValues(res.data?.data || []);
    } catch (err) {
      console.log('Failed to refresh pump details:', err);
    }
  }

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const [settingsRes, latestRes] = await Promise.all([
          API.get('/db/settings'),
          API.get('/db/latest-values'),
        ]);

        if (!active) return;

        const settings = settingsRes.data?.data || {};

        setPumps(settings.pumps || []);
        setTags(settings.tags || []);
        setLatestValues(latestRes.data?.data || []);
      } catch (err) {
        console.log('Failed to load pump details:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 0);

    const interval = setInterval(async () => {
      await refreshLatestValues(active);
    }, 3000);

    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const pumpCards = useMemo(() => {
    return pumps.map((pump) => {
      const live = latestValues.find(
        (item) => String(item.id) === String(pump.id)
      );

      const pumpTags = tags.filter(
        (tag) => String(tag.pump_id) === String(pump.id)
      );

      return {
        pump,
        values: live?.values || {},
        tags: pumpTags,
      };
    });
  }, [pumps, latestValues, tags]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="text-sm font-bold text-slate-500">
          Loading pump details...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-4 xl:px-8">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">
            Pump Detail Monitoring
          </h1>

          <p className="text-sm font-semibold text-slate-500">
            Detail status, sensor, alarm, speed, runtime, dan register setiap pompa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshLatestValues(true)}
          className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {pumpCards.map(({ pump, values, tags: pumpTags }) => (
          <PumpDetailCard
            key={pump.id}
            pump={pump}
            values={values}
            tags={pumpTags}
          />
        ))}

        {pumpCards.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-400 shadow-sm">
            No pump data found.
          </div>
        )}
      </div>
    </div>
  );
}

function PumpDetailCard({ pump, values, tags }) {
  const runningRow = findValueByKeysOrLabel(values, {
  keys: [
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
  ],
  labelKeywords: [
    'vsd run',
    'run feedback',
    'running',
    'motor run',
    'pump run',
    'run status',
    'remote cmd',
    'start',
  ],
  excludeKeywords: [
    'run hour',
    'hour',
    'runtime',
    'reff',
    'ref',
    'reference',
    'speed',
  ],
});

  const runningValue = runningRow?.value;
  const isRunning = toBooleanStatus(runningValue);

  const lastUpdate = getLastUpdate(values);

  const electricalRows = [
    makeRow(values, 'voltage', 'Voltage'),
    makeRow(values, 'current', 'Current'),
    makeRow(values, 'power', 'Power'),
    makeRow(values, 'frequency', 'Frequency'),
    makeRow(values, 'vsd_frequency', 'VSD Frequency'),
    makeRow(values, 'kwh', 'Energy'),
    makeRow(values, 'energy', 'Energy'),
  ].filter(Boolean);

  const operationRows = [
    makeRow(values, 'speed_actual', 'Actual Speed'),
    makeRow(values, 'speed', 'Speed'),
    makeRow(values, 'speed_ref', 'Speed Ref'),
    makeRow(values, 'reff_speed', 'Reference Speed'),
    makeRow(values, 'run_hour', 'Run Hour'),
    makeRow(values, 'vsd_run_hour', 'VSD Run Hour'),
  ].filter(Boolean);

  const statusRows = Object.keys(values)
    .filter((key) =>
      key.includes('remote') ||
      key.includes('run') ||
      key.includes('status') ||
      key.includes('start') ||
      key.includes('stop')
    )
    .map((key) => makeRow(values, key, values[key]?.label || key))
    .filter(Boolean);

  const alarmRows = Object.keys(values)
    .filter((key) =>
      key.includes('alarm') ||
      key.includes('fault') ||
      key.includes('trip') ||
      key.includes('bimetal') ||
      key.includes('bearing') ||
      key.includes('seal') ||
      key.includes('emergency') ||
      key.includes('mstc')
    )
    .map((key) => makeRow(values, key, values[key]?.label || key))
    .filter(Boolean);

  const processRows = Object.keys(values)
    .filter((key) =>
      key.includes('flow') ||
      key.includes('pressure') ||
      key.includes('level') ||
      key.includes('temp')
    )
    .map((key) => makeRow(values, key, values[key]?.label || key))
    .filter(Boolean);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            {pump.pump_name}
          </h2>

          <p className="text-sm font-semibold text-slate-500">
            {pump.pump_code} · {pump.device_name || 'Main Pump PLC'}
          </p>
        </div>

        <StatusBadge
          active={isRunning}
          activeText="Running"
          inactiveText="Stopped"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
        <MiniSummary
          title="Last Data"
          value={lastUpdate ? formatTime(lastUpdate) : '-'}
        />

        <MiniSummary
          title="Registers"
          value={tags.length}
        />

        <MiniSummary
          title="Run Source"
          value={runningRow?.label || runningRow?.key || '-'}
        />

        <MiniSummary
          title="Run Status"
          value={isRunning ? 'ON' : 'OFF'}
        />
      </div>

      <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
        <DetailPanel title="Electrical" rows={electricalRows} />
        <DetailPanel title="Speed & Runtime" rows={operationRows} />
        <DetailPanel title="Status Feedback" rows={statusRows} />
        <DetailPanel title="Alarm / Fault" rows={alarmRows} />
      </div>

      <div className="px-5 pb-5">
        <DetailPanel title="Process Sensor" rows={processRows} compact />
      </div>
    </section>
  );
}

function DetailPanel({ title, rows, compact = false }) {
  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-black text-slate-900">
          {title}
        </h3>

        <span className="text-xs font-bold text-slate-400">
          {rows.length} items
        </span>
      </div>

      <div
        className={
          compact
            ? 'grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0'
            : 'divide-y divide-slate-100'
        }
      >
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-800">
                {row.label}
              </div>

              <div className="text-xs font-semibold text-slate-400">
                {row.key}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-slate-950">
                {formatValue(row.value)}
              </div>

              <div className="text-xs font-bold text-slate-400">
                {row.unit || '-'}
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="px-4 py-6 text-center text-sm font-semibold text-slate-400">
            No data
          </div>
        )}
      </div>
    </div>
  );
}

function MiniSummary({ title, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs font-bold uppercase text-slate-400">
        {title}
      </div>

      <div className="mt-1 truncate text-sm font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ active, activeText, inactiveText }) {
  return (
    <span
      className={
        active
          ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700'
          : 'rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700'
      }
    >
      {active ? activeText : inactiveText}
    </span>
  );
}

function makeRow(values, key, fallbackLabel) {
  const item = values?.[key];

  if (!item) return null;

  return {
    key,
    label: item.label || fallbackLabel || key,
    value: item.value_text ?? item.value_number ?? item.raw_value ?? null,
    unit: item.unit || '',
    quality: item.quality || 'good',
    updated_at: item.updated_at,
  };
}

function findValueByKeysOrLabel(
  values,
  { keys = [], labelKeywords = [], excludeKeywords = [] }
) {
  for (const key of keys) {
    const item = values?.[key];

    if (item) {
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

function toBooleanStatus(value) {
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
    text === 'stopped' ||
    text === 'stop' ||
    text === ''
  ) {
    return false;
  }

  return false;
}

function getLastUpdate(values) {
  const dates = Object.values(values || {})
    .map((item) => item.updated_at)
    .filter(Boolean);

  if (dates.length === 0) return null;

  return dates.sort().reverse()[0];
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (value === true) return 'ON';
  if (value === false) return 'OFF';

  const text = String(value).trim().toLowerCase();

  if (text === 'true' || text === '1') return 'ON';
  if (text === 'false' || text === '0') return 'OFF';

  const numberValue = Number(value);

  if (!Number.isNaN(numberValue)) {
    return numberValue.toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    });
  }

  return value;
}

function formatTime(value) {
  if (!value) return '-';

  return new Date(value).toLocaleString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}