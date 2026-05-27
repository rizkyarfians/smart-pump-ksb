export default function RegistersTab({
  tags,
  onAddRegister,
  onEditTag,
  onToggleTagEnabled,
}) {
  const registerRows = [...tags]
    .filter((tag) => {
      const registerType = String(tag.register_type || '').toLowerCase();

      return (
        registerType === 'holding_register' ||
        registerType === 'input_register'
      );
    })
    .sort(
      (a, b) =>
        Number(a.register_address || 0) -
        Number(b.register_address || 0),
    );

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

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[1220px] text-left text-sm">
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
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {registerRows.map((tag) => {
              const enabled = Number(tag.is_enabled) === 1;

              return (
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
                    {tag.quantity || 1}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {tag.data_type || '-'}
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

                  <td className="px-4 py-3">
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

                  <td className="px-4 py-3 text-right">
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

            {registerRows.length === 0 && (
              <tr>
                <td
                  colSpan="12"
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