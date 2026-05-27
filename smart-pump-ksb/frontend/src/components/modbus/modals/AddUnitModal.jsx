import InputField from '../common/InputField';

export default function AddUnitModal({
  value,
  onChange,
  loading,
  onClose,
  onSubmit,
}) {
  const updateField = (field, fieldValue) => {
    onChange((prev) => ({
      ...prev,
      [field]: fieldValue,
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-950">
            Add Pump Unit
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Tambahkan unit pompa baru ke database monitoring.
          </p>
        </div>

        <div className="space-y-4">
          <InputField
            label="Unit Name"
            value={value.pumpName}
            onChange={(nextValue) => updateField('pumpName', nextValue)}
            placeholder="Contoh: Amacan 4"
          />

          <InputField
            label="Unit Code"
            value={value.pumpCode}
            onChange={(nextValue) => updateField('pumpCode', nextValue)}
            placeholder="Contoh: PUMP_5"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !String(value.pumpName).trim()}
            className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Add Unit'}
          </button>
        </div>
      </div>
    </div>
  );
}