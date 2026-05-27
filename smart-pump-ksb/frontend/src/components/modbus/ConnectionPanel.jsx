import InputField from './common/InputField';

export default function ConnectionPanel({
  form,
  loading,
  visibleConnectionResult,
  onUpdateField,
  onTestConnection,
  onSaveConfig,
}) {
  return (
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

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.isEnabled}
            onChange={(e) => onUpdateField('isEnabled', e.target.checked)}
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
          onClick={onTestConnection}
          disabled={loading}
          className="h-11 rounded-xl bg-slate-800 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          type="button"
          onClick={onSaveConfig}
          disabled={loading}
          className="h-11 rounded-xl bg-blue-700 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Setting'}
        </button>
      </div>
    </section>
  );
}