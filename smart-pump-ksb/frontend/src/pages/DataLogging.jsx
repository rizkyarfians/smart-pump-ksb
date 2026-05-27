import { useEffect, useMemo, useState } from 'react';

import API from '../services/api';
import PumpHistoricalChart from '../components/charts/PumpHistoricalChart';

export default function DataLogging() {
  const [pumps, setPumps] = useState([]);
  const [tags, setTags] = useState([]);

  const [logType, setLogType] = useState('plc');
  const [pumpId, setPumpId] = useState('');
  const [tagKey, setTagKey] = useState('');
  const [command, setCommand] = useState('');
  const [alarmType, setAlarmType] = useState('');
  const [alarmStatus, setAlarmStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [limit, setLimit] = useState(500);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  function buildQuery() {
    const params = new URLSearchParams();

    if (pumpId) params.append('pump_id', pumpId);
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    if (limit) params.append('limit', String(limit));

    if (logType === 'plc' && tagKey) {
      params.append('tag_key', tagKey);
    }

    if (logType === 'command' && command) {
      params.append('command', command);
    }

    if (logType === 'alarm') {
      if (alarmType) params.append('alarm_type', alarmType);
      if (alarmStatus) params.append('status', alarmStatus);
    }

    return params.toString();
  }

  function getEndpoint(query) {
    if (logType === 'command') {
      return `/db/command-logs?${query}`;
    }

    if (logType === 'alarm') {
      return `/alarms/logs?${query}`;
    }

    return `/db/datalogs?${query}`;
  }

  async function fetchLogs() {
    try {
      setLoading(true);

      const query = buildQuery();
      const endpoint = getEndpoint(query);

      const res = await API.get(endpoint);

      setRows(res.data?.data || []);
    } catch (err) {
      console.log('Failed to load logs:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setPumpId('');
    setTagKey('');
    setCommand('');
    setAlarmType('');
    setAlarmStatus('');
    setFromDate('');
    setToDate('');
    setLimit(500);
  }

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      try {
        const res = await API.get('/db/settings');

        if (!active) return;

        const data = res.data?.data || {};

        setPumps(data.pumps || []);
        setTags(data.tags || []);
      } catch (err) {
        console.log('Failed to load settings:', err);
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();

        if (pumpId) params.append('pump_id', pumpId);
        if (fromDate) params.append('from', fromDate);
        if (toDate) params.append('to', toDate);
        if (limit) params.append('limit', String(limit));

        if (logType === 'plc' && tagKey) {
          params.append('tag_key', tagKey);
        }

        if (logType === 'command' && command) {
          params.append('command', command);
        }

        if (logType === 'alarm') {
          if (alarmType) params.append('alarm_type', alarmType);
          if (alarmStatus) params.append('status', alarmStatus);
        }

        let endpoint = `/db/datalogs?${params.toString()}`;

        if (logType === 'command') {
          endpoint = `/db/command-logs?${params.toString()}`;
        }

        if (logType === 'alarm') {
          endpoint = `/alarms/logs?${params.toString()}`;
        }

        const res = await API.get(endpoint);

        if (!active) return;

        setRows(res.data?.data || []);
      } catch (err) {
        console.log('Failed to load logs:', err);

        if (active) {
          setRows([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    logType,
    pumpId,
    tagKey,
    command,
    alarmType,
    alarmStatus,
    fromDate,
    toDate,
    limit,
  ]);

  const filteredTags = useMemo(() => {
    if (!pumpId) return tags;

    return tags.filter((tag) => String(tag.pump_id) === String(pumpId));
  }, [tags, pumpId]);

  const pumpOptions = useMemo(() => {
    return [
      { key: 'pump-all', value: '', label: 'All Pumps' },
      ...pumps.map((pump) => ({
        key: `pump-${pump.id}`,
        value: String(pump.id),
        label: pump.pump_name,
      })),
    ];
  }, [pumps]);

  const tagOptions = useMemo(() => {
    return [
      { key: 'tag-all', value: '', label: 'All Tags' },
      ...filteredTags.map((tag, index) => ({
        key: `tag-${tag.id || index}-${tag.pump_id || 'pump'}-${tag.tag_key}`,
        value: tag.tag_key,
        label: `${tag.tag_key} - ${tag.label}`,
      })),
    ];
  }, [filteredTags]);

  const pageTitle =
    logType === 'plc'
      ? 'PLC Historical Data'
      : logType === 'command'
        ? 'Command History'
        : 'Alarm History';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-4 xl:px-8">
      <div className="mb-5 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            Data Logging
          </h1>

          <p className="text-sm font-medium text-slate-500">
            Historical PLC values, command actions, alarm events, and Modbus activity logs.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {logType === 'plc' && (
        <div className="mb-5">
          <PumpHistoricalChart
            pumps={pumps}
            title="Historical Trend Chart"
          />
        </div>
      )}

      <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[180px_180px_220px_180px_180px_140px_auto]">
          <SelectField
            label="Log Type"
            value={logType}
            onChange={(value) => {
              setLogType(value);
              setTagKey('');
              setCommand('');
              setAlarmType('');
              setAlarmStatus('');
            }}
            options={[
              { key: 'log-type-plc', value: 'plc', label: 'PLC Values' },
              { key: 'log-type-command', value: 'command', label: 'Commands' },
              { key: 'log-type-alarm', value: 'alarm', label: 'Alarms' },
            ]}
          />

          <SelectField
            label="Pump"
            value={pumpId}
            onChange={(value) => {
              setPumpId(value);
              setTagKey('');
            }}
            options={pumpOptions}
          />

          {logType === 'plc' && (
            <SelectField
              label="Tag"
              value={tagKey}
              onChange={setTagKey}
              options={tagOptions}
            />
          )}

          {logType === 'command' && (
            <SelectField
              label="Command"
              value={command}
              onChange={setCommand}
              options={[
                { key: 'command-all', value: '', label: 'All Commands' },
                { key: 'command-start', value: 'START', label: 'START' },
                { key: 'command-stop', value: 'STOP', label: 'STOP' },
                {
                  key: 'command-submit-speed-ref',
                  value: 'SUBMIT_SPEED_REF',
                  label: 'SPEED REF',
                },
              ]}
            />
          )}

          {logType === 'alarm' && (
            <SelectField
              label="Alarm Type"
              value={alarmType}
              onChange={setAlarmType}
              options={[
                { key: 'alarm-type-all', value: '', label: 'All Types' },
                { key: 'alarm-type-alarm', value: 'ALARM', label: 'ALARM' },
                { key: 'alarm-type-warning', value: 'WARNING', label: 'WARNING' },
                {
                  key: 'alarm-type-information',
                  value: 'INFORMATION',
                  label: 'INFORMATION',
                },
              ]}
            />
          )}

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

          <InputField
            label="Limit"
            type="number"
            value={limit}
            onChange={setLimit}
          />

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </div>

        {logType === 'alarm' && (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[220px_220px_1fr]">
            <SelectField
              label="Alarm Status"
              value={alarmStatus}
              onChange={setAlarmStatus}
              options={[
                { key: 'alarm-status-all', value: '', label: 'All Status' },
                { key: 'alarm-status-active', value: 'ACTIVE', label: 'ACTIVE' },
                {
                  key: 'alarm-status-not-active',
                  value: 'NOT_ACTIVE',
                  label: 'NOT_ACTIVE',
                },
                {
                  key: 'alarm-status-acknowledged',
                  value: 'ACKNOWLEDGED',
                  label: 'ACKNOWLEDGED',
                },
              ]}
            />

            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-bold uppercase text-slate-400">
                Data Source
              </div>
              <div className="mt-1 text-sm font-black text-slate-800">
                alarm_events
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-bold uppercase text-slate-400">
                Endpoint
              </div>
              <div className="mt-1 text-sm font-black text-slate-800">
                /api/alarms/logs
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-950">
            {pageTitle}
          </h2>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {rows.length} rows
          </span>
        </div>

        {logType === 'plc' && (
          <PlcLogTable rows={rows} loading={loading} />
        )}

        {logType === 'command' && (
          <CommandLogTable rows={rows} loading={loading} />
        )}

        {logType === 'alarm' && (
          <AlarmLogTable rows={rows} loading={loading} />
        )}
      </section>
    </div>
  );
}

function PlcLogTable({ rows, loading }) {
  return (
    <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Pump</th>
            <th className="px-4 py-3">Tag</th>
            <th className="px-4 py-3">Label</th>
            <th className="px-4 py-3">PLC Addr</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Raw</th>
            <th className="px-4 py-3">Unit</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={`plc-row-${row.id || index}-${row.logged_at || 'time'}`}>
              <td className="px-4 py-3 font-semibold text-slate-700">
                {formatDateTime(row.logged_at)}
              </td>

              <td className="px-4 py-3">
                <div className="font-bold text-slate-900">
                  {row.pump_name}
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  {row.pump_code}
                </div>
              </td>

              <td className="px-4 py-3 font-bold text-slate-700">
                {row.tag_key}
              </td>

              <td className="px-4 py-3 text-slate-600">
                {row.label}
              </td>

              <td className="px-4 py-3 font-bold text-slate-700">
                {row.plc_address || row.register_address}
              </td>

              <td className="px-4 py-3 font-black text-slate-950">
                {formatValue(row.value_text ?? row.value_number)}
              </td>

              <td className="px-4 py-3 text-slate-500">
                {row.raw_value ?? '-'}
              </td>

              <td className="px-4 py-3 text-slate-500">
                {row.unit || '-'}
              </td>
            </tr>
          ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td
                colSpan="8"
                className="px-4 py-8 text-center text-sm font-semibold text-slate-400"
              >
                No PLC historical data found.
              </td>
            </tr>
          )}

          {loading && (
            <tr>
              <td
                colSpan="8"
                className="px-4 py-8 text-center text-sm font-semibold text-slate-400"
              >
                Loading PLC historical data...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CommandLogTable({ rows, loading }) {
  return (
    <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1050px] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Pump</th>
            <th className="px-4 py-3">Command</th>
            <th className="px-4 py-3">Tag</th>
            <th className="px-4 py-3">PLC Addr</th>
            <th className="px-4 py-3">Requested</th>
            <th className="px-4 py-3">Raw</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Message</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={`command-row-${row.id || index}-${row.logged_at || 'time'}`}>
              <td className="px-4 py-3 font-semibold text-slate-700">
                {formatDateTime(row.logged_at)}
              </td>

              <td className="px-4 py-3">
                <div className="font-bold text-slate-900">
                  {row.pump_name || '-'}
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  {row.pump_code || '-'}
                </div>
              </td>

              <td className="px-4 py-3">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                  {row.command}
                </span>
              </td>

              <td className="px-4 py-3 font-bold text-slate-700">
                {row.tag_key || '-'}
              </td>

              <td className="px-4 py-3 font-bold text-slate-700">
                {row.plc_address || '-'}
              </td>

              <td className="px-4 py-3 text-slate-700">
                {row.requested_value ?? '-'}
              </td>

              <td className="px-4 py-3 text-slate-500">
                {row.raw_value ?? '-'}
              </td>

              <td className="px-4 py-3">
                <span
                  className={
                    Number(row.success) === 1
                      ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700'
                      : 'rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700'
                  }
                >
                  {Number(row.success) === 1 ? 'Success' : 'Failed'}
                </span>
              </td>

              <td className="px-4 py-3 text-slate-500">
                {row.message || '-'}
              </td>
            </tr>
          ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td
                colSpan="9"
                className="px-4 py-8 text-center text-sm font-semibold text-slate-400"
              >
                No command history found.
              </td>
            </tr>
          )}

          {loading && (
            <tr>
              <td
                colSpan="9"
                className="px-4 py-8 text-center text-sm font-semibold text-slate-400"
              >
                Loading command history...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AlarmLogTable({ rows, loading }) {
  return (
    <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Started</th>
            <th className="px-4 py-3">Ended</th>
            <th className="px-4 py-3">Pump</th>
            <th className="px-4 py-3">Tag</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Alarm Key</th>
            <th className="px-4 py-3">Alarm Text</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Raw</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={`alarm-row-${row.id || index}-${row.started_at || 'time'}`}>
              <td className="px-4 py-3 font-semibold text-slate-700">
                {formatDateTime(row.started_at)}
              </td>

              <td className="px-4 py-3 font-semibold text-slate-500">
                {formatDateTime(row.ended_at)}
              </td>

              <td className="px-4 py-3">
                <div className="font-bold text-slate-900">
                  {row.pump_name || '-'}
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  {row.pump_code || '-'}
                </div>
              </td>

              <td className="px-4 py-3">
                <div className="font-bold text-slate-700">
                  {row.tag_key || '-'}
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  {row.label || '-'}
                </div>
              </td>

              <td className="px-4 py-3">
                <span className={getAlarmTypeClass(row.alarm_type)}>
                  {row.alarm_type || '-'}
                </span>
              </td>

              <td className="px-4 py-3 font-bold text-slate-700">
                {row.alarm_key || '-'}
              </td>

              <td className="px-4 py-3 text-slate-600">
                {row.alarm_text || '-'}
              </td>

              <td className="px-4 py-3 font-black text-slate-950">
                {formatValue(row.value_number)}
              </td>

              <td className="px-4 py-3 text-slate-500">
                {row.raw_value ?? '-'}
              </td>

              <td className="px-4 py-3">
                <span className={getAlarmStatusClass(row.status)}>
                  {row.status || '-'}
                </span>
              </td>
            </tr>
          ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td
                colSpan="10"
                className="px-4 py-8 text-center text-sm font-semibold text-slate-400"
              >
                No alarm history found.
              </td>
            </tr>
          )}

          {loading && (
            <tr>
              <td
                colSpan="10"
                className="px-4 py-8 text-center text-sm font-semibold text-slate-400"
              >
                Loading alarm history...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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
        {options.map((option, index) => (
          <option
            key={option.key || `${label}-${option.value}-${index}`}
            value={option.value}
          >
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

function getAlarmTypeClass(type) {
  if (type === 'ALARM') {
    return 'rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700';
  }

  if (type === 'WARNING') {
    return 'rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700';
  }

  if (type === 'INFORMATION') {
    return 'rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700';
  }

  return 'rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700';
}

function getAlarmStatusClass(status) {
  if (status === 'ACTIVE') {
    return 'rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700';
  }

  if (status === 'ACKNOWLEDGED') {
    return 'rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700';
  }

  if (status === 'NOT_ACTIVE') {
    return 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700';
  }

  return 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700';
}

function formatDateTime(value) {
  if (!value) return '-';

  return new Date(value).toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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