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

export default function LiveTab({
  form,
  liveRows,
  lastUpdate,
}) {
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