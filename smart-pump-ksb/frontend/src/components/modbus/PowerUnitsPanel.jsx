import InfoCard from './common/InfoCard';
import UnitStatusBadge from './common/UnitStatusBadge';

export default function PowerUnitsPanel({
  pumps,
  tags,
  form,
  onAddUnit,
  onEditUnit,
  onRenameUnit,
  onDisableUnit,
  onEnableUnit,
  onDeleteUnit,
  getPumpConnectionStatus,
}) {
  const activePumps = pumps.filter((pump) => {
    return Number(pump.is_enabled ?? 1) === 1;
  });

  const inactivePumps = pumps.filter((pump) => {
    return Number(pump.is_enabled ?? 1) !== 1;
  });

  return (
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
          onClick={onAddUnit}
          className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Add Unit
        </button>
      </div>

      <UnitTable
        title="Active Units"
        description="Unit yang aktif dan dipakai oleh sistem monitoring."
        emptyText="No active pump unit found."
        pumps={activePumps}
        tags={tags}
        form={form}
        getPumpConnectionStatus={getPumpConnectionStatus}
        onEditUnit={onEditUnit}
        onRenameUnit={onRenameUnit}
        onDisableUnit={onDisableUnit}
        actionMode="active"
      />

      <div className="mt-6">
        <UnitTable
          title="Inactive Units"
          description="Unit yang dinonaktifkan. Data tetap tersimpan, tapi tidak dipakai sebagai unit aktif."
          emptyText="No inactive pump unit."
          pumps={inactivePumps}
          tags={tags}
          form={form}
          getPumpConnectionStatus={getPumpConnectionStatus}
          onEditUnit={onEditUnit}
          onRenameUnit={onRenameUnit}
          onEnableUnit={onEnableUnit}
          actionMode="inactive"
          onDeleteUnit={onDeleteUnit}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
        <InfoCard title="Connection Type" value="Modbus TCP/IP" />
        <InfoCard title="Default Port" value={form.port || 502} />
        <InfoCard title="Active Pumps" value={activePumps.length} />
        <InfoCard title="Inactive Pumps" value={inactivePumps.length} />
      </div>
    </section>
  );
}

function UnitTable({
  title,
  description,
  emptyText,
  pumps,
  tags,
  form,
  getPumpConnectionStatus,
  onEditUnit,
  onRenameUnit,
  onDisableUnit,
  onEnableUnit,
  actionMode,
  onDeleteUnit,
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-base font-bold text-slate-950">
          {title}
        </h3>

        <p className="mt-1 text-xs font-semibold text-slate-500">
          {description}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Host</th>
              <th className="px-4 py-3">Registers</th>
              <th className="px-4 py-3">Connection</th>
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
                    {actionMode === 'active' ? (
                      <UnitStatusBadge connectionStatus={pumpConnectionStatus} />
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEditUnit?.(pump.id, 'live')}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onRenameUnit?.(pump)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                      >
                        Rename
                      </button>

                      {actionMode === 'active' ? (
  <button
    type="button"
    onClick={() => onDisableUnit?.(pump)}
    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
  >
    Disable
  </button>
) : (
  <>
    <button
      type="button"
      onClick={() => onEnableUnit?.(pump)}
      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
    >
      Enable
    </button>

    <button
      type="button"
      onClick={() => onDeleteUnit?.(pump)}
      className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-800"
    >
      Delete
    </button>
  </>
)}
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
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}