import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import API from '../../services/api';

const TAG_OPTIONS = [
  { value: 'power', label: 'Power' },
  { value: 'current', label: 'Current' },
  { value: 'voltage', label: 'Voltage' },
  { value: 'speed', label: 'Speed' },
  { value: 'vsd_frequency', label: 'Frequency' },
  { value: 'vsd_run_hour', label: 'Run Hour' },
  { value: 'flow', label: 'Flow' },
  { value: 'discharge_pressure', label: 'Discharge Pressure' },
  { value: 'level', label: 'Water Level' },
  { value: 'water_level', label: 'Water Level Sensor' },
];

export default function PumpHistoricalChart({
  pumps = [],
  title = 'Historical Trend Chart',
}) {
  const [selectedPumpId, setSelectedPumpId] = useState('');
  const [selectedTag, setSelectedTag] = useState('power');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const effectivePumpId = selectedPumpId || getFirstPumpId(pumps);

  const selectedPump = useMemo(() => {
    return pumps.find((pump) => String(pump.id) === String(effectivePumpId));
  }, [pumps, effectivePumpId]);

  const selectedTagOption = useMemo(() => {
    return TAG_OPTIONS.find((item) => item.value === selectedTag);
  }, [selectedTag]);

  const fetchChartData = useCallback(async () => {
    if (!effectivePumpId || !selectedTag) {
      setRows([]);
      setMeta(null);
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams();

      params.append('pump_id', effectivePumpId);
      params.append('tag_keys', selectedTag);
      params.append('max_points', '100000');

      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await API.get(`/db/history-chart?${params.toString()}`);

      setRows(res.data?.data || []);
      setMeta(res.data?.meta || null);
    } catch (err) {
      console.log('Failed to load historical chart:', err);
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [effectivePumpId, selectedTag, fromDate, toDate]);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      if (active) {
        await fetchChartData();
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchChartData]);

  const chartData = useMemo(() => {
    return rows.map((row) => ({
      logged_at: row.logged_at,
      timeLabel: formatTime(row.logged_at),
      value: getNumericValue(row),
    }));
  }, [rows]);

  const unit = useMemo(() => {
    return rows.find((row) => row.unit)?.unit || '';
  }, [rows]);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Grafik tren historis satu parameter per pompa.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchChartData}
          disabled={loading || !effectivePumpId}
          className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh Chart'}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-[220px_240px_1fr_1fr_auto]">
        <SelectField
          label="Pump"
          value={effectivePumpId}
          onChange={setSelectedPumpId}
          options={pumps.map((pump) => ({
            value: String(pump.id),
            label: pump.pump_name,
          }))}
        />

        <SelectField
          label="Parameter"
          value={selectedTag}
          onChange={setSelectedTag}
          options={TAG_OPTIONS}
        />

        <InputField
          label="From"
          type="date"
          value={fromDate}
          onChange={setFromDate}
        />

        <InputField
          label="To"
          type="date"
          value={toDate}
          onChange={setToDate}
        />

        <div className="flex items-end">
          <button
            type="button"
            onClick={fetchChartData}
            disabled={loading || !effectivePumpId}
            className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoBox
          label="Selected Pump"
          value={selectedPump?.pump_name || '-'}
        />

        <InfoBox
          label="Selected Parameter"
          value={`${selectedTagOption?.label || selectedTag}${unit ? ` (${unit})` : ''}`}
        />

        <InfoBox
          label="Data Mode"
          value={
            meta?.mode === 'average_sampling'
              ? `Average / ${meta.bucket_seconds}s`
              : 'Raw'
          }
        />
      </div>

      <div className="h-[360px] rounded-2xl border border-slate-200 p-4">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 11 }}
                minTickGap={24}
              />

              <YAxis
                tick={{ fontSize: 11 }}
                label={
                  unit
                    ? {
                        value: unit,
                        angle: -90,
                        position: 'insideLeft',
                        fontSize: 12,
                      }
                    : undefined
                }
              />

              <Tooltip
                formatter={(value) => [
                  formatValue(value),
                  selectedTagOption?.label || selectedTag,
                ]}
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="value"
                name={selectedTagOption?.label || selectedTag}
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm font-bold text-slate-400">
            {effectivePumpId
              ? 'No historical chart data found for this pump and parameter.'
              : 'No pump available.'}
          </div>
        )}
      </div>
    </section>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
      >
        {options.length === 0 && (
          <option value="">
            No pump
          </option>
        )}

        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-bold uppercase text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-black text-slate-900">
        {value}
      </div>
    </div>
  );
}

function getFirstPumpId(pumps) {
  if (!Array.isArray(pumps) || pumps.length === 0) {
    return '';
  }

  return String(pumps[0].id);
}

function getNumericValue(row) {
  if (row.value_number !== null && row.value_number !== undefined) {
    return Number(row.value_number);
  }

  const textValue = row.value_text ?? row.raw_value;
  const numberValue = Number(textValue);

  if (!Number.isNaN(numberValue)) {
    return numberValue;
  }

  return null;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

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
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}