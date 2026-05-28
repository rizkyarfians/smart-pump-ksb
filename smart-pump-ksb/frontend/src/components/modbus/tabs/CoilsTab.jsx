export default function CoilsTab({
  coilRows,
  onAddCoil,
  onEditTag,
  onToggleTagEnabled,
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            Coils / Commands
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Mapping status boolean, alarm, dan command PLC.
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

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">PLC Address</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {coilRows.map((tag) => {
              const enabled = Number(tag.is_enabled) === 1;
              const readable = Number(tag.is_readable) === 1;
              const writable = Number(tag.is_writable) === 1;

              return (
                <tr key={tag.id} className="align-top">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">
                      {tag.tag_key}
                    </div>

                    <div className="mt-1 max-w-[240px] text-xs font-medium text-slate-500">
                      {tag.label}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-bold text-slate-900">
                      {tag.plc_address || `%M${tag.register_address}`}
                    </div>

                    <div className="mt-1 text-xs font-medium text-slate-400">
                      Addr {tag.register_address} · {tag.register_type} · {tag.data_type}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {readable && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          Read
                        </span>
                      )}

                      {writable && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          Write
                        </span>
                      )}

                      {!readable && !writable && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          None
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={
                        enabled
                          ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700'
                          : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500'
                      }
                    >
                      {enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEditTag?.(tag)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleTagEnabled?.(tag)}
                        className={
                          enabled
                            ? 'rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700'
                            : 'rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700'
                        }
                      >
                        {enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {coilRows.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="px-4 py-6 text-center text-sm font-semibold text-slate-400"
                >
                  No coil or command mapping found for this unit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}