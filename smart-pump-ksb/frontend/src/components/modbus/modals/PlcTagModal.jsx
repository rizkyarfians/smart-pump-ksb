import InputField from '../common/InputField';
import SelectField from '../common/SelectField';

export default function PlcTagModal({
  type,
  mode = 'add',
  pumps,
  value,
  onChange,
  loading,
  onClose,
  onSubmit,
}) {
  const isCoil = type === 'coil';
  const isEdit = mode === 'edit';

  const updateField = (field, fieldValue) => {
    onChange((prev) => ({
      ...prev,
      [field]: fieldValue,
    }));
  };

  const updatePlcAddress = (nextValue) => {
    onChange((prev) => {
      const parsedAddress = parseRegisterAddressFromText(nextValue);

      const shouldFillRegisterAddress =
        !String(prev.registerAddress || '').trim() && parsedAddress !== '';

      return {
        ...prev,
        plcAddress: nextValue,
        registerAddress: shouldFillRegisterAddress
          ? parsedAddress
          : prev.registerAddress,
      };
    });
  };

  const updateRegisterType = (nextValue) => {
    onChange((prev) => {
      const nextIsBool =
        nextValue === 'coil' || nextValue === 'discrete_input';

      return {
        ...prev,
        registerType: nextValue,
        dataType: nextIsBool
          ? 'bool'
          : prev.dataType === 'bool'
            ? 'uint16'
            : prev.dataType,
        quantity: nextIsBool ? 1 : prev.quantity,
        isWritable:
          nextValue === 'discrete_input' || nextValue === 'input_register'
            ? false
            : prev.isWritable,
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-950">
            {isEdit
              ? isCoil
                ? 'Edit Coil Mapping'
                : 'Edit Register Mapping'
              : isCoil
                ? 'Add Coil Mapping'
                : 'Add Register Mapping'}
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Mapping ini hanya mendaftarkan alamat PLC yang sudah ada di ladder.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField
            label="Pump Unit"
            value={String(value.pumpId)}
            onChange={(nextValue) => updateField('pumpId', nextValue)}
            options={pumps.map((pump) => ({
              value: String(pump.id),
              label: `${pump.pump_name} - ${pump.pump_code}`,
            }))}
          />

          <InputField
            label="Tag Key"
            value={value.tagKey}
            onChange={(nextValue) => updateField('tagKey', nextValue)}
            placeholder={isCoil ? 'vsd_run' : 'power'}
          />

          <InputField
            label="Label"
            value={value.label}
            onChange={(nextValue) => updateField('label', nextValue)}
            placeholder={isCoil ? 'VSD Run Feedback' : 'Power VSD'}
          />

          <InputField
            label="PLC Address"
            value={value.plcAddress}
            onChange={updatePlcAddress}
            placeholder={isCoil ? '%M104' : '%MW100'}
          />

          <InputField
            label="Register Address"
            type="number"
            value={value.registerAddress}
            onChange={(nextValue) => updateField('registerAddress', nextValue)}
            placeholder={isCoil ? '104' : '100'}
          />

          <SelectField
            label="Register Type"
            value={value.registerType}
            onChange={updateRegisterType}
            options={
              isCoil
                ? [
                    { value: 'coil', label: 'Coil / %M' },
                    { value: 'discrete_input', label: 'Discrete Input' },
                  ]
                : [
                    {
                      value: 'holding_register',
                      label: 'Holding Register / %MW',
                    },
                    {
                      value: 'input_register',
                      label: 'Input Register',
                    },
                  ]
            }
          />

          <SelectField
            label="Data Type"
            value={value.dataType}
            onChange={(nextValue) => updateField('dataType', nextValue)}
            options={
              isCoil
                ? [{ value: 'bool', label: 'Bool' }]
                : [
                    { value: 'uint16', label: 'UInt16' },
                    { value: 'int16', label: 'Int16' },
                    { value: 'uint32', label: 'UInt32' },
                    { value: 'int32', label: 'Int32' },
                  ]
            }
          />

          <InputField
            label="Quantity"
            type="number"
            value={value.quantity}
            onChange={(nextValue) => updateField('quantity', nextValue)}
            placeholder="1"
          />

          {!isCoil && (
            <>
              <InputField
                label="Unit"
                value={value.unit}
                onChange={(nextValue) => updateField('unit', nextValue)}
                placeholder="kW / A / V / Hz"
              />

              <InputField
                label="Scale"
                type="number"
                value={value.scaleValue}
                onChange={(nextValue) => updateField('scaleValue', nextValue)}
                placeholder="1"
              />

              <InputField
                label="Offset"
                type="number"
                value={value.offsetValue}
                onChange={(nextValue) => updateField('offsetValue', nextValue)}
                placeholder="0"
              />
            </>
          )}

          <label className="flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(value.isReadable)}
              onChange={(e) => updateField('isReadable', e.target.checked)}
            />
            Readable
          </label>

          <label className="flex items-center gap-2 pt-8 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(value.isWritable)}
              onChange={(e) => updateField('isWritable', e.target.checked)}
            />
            Writable / Command
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(value.isEnabled)}
              onChange={(e) => updateField('isEnabled', e.target.checked)}
            />
            Enabled
          </label>
        </div>

        {Boolean(value.isWritable) && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            Hati-hati: Writable tag bisa menulis ke PLC. Pastikan alamat ini
            memang command di ladder PLC.
          </div>
        )}

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
            disabled={
              loading ||
              !value.pumpId ||
              !String(value.tagKey).trim() ||
              !String(value.label).trim() ||
              !String(value.plcAddress).trim() ||
              !String(value.registerAddress).trim()
            }
            className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Saving...'
              : isEdit
                ? 'Save Changes'
                : 'Save Mapping'}
          </button>
        </div>
      </div>
    </div>
  );
}

function parseRegisterAddressFromText(value) {
  const text = String(value || '').trim().toUpperCase();

  const match = text.match(/%M(?:W)?(\d+)/);

  if (match) {
    return match[1];
  }

  const numberMatch = text.match(/\d+/);

  return numberMatch ? numberMatch[0] : '';
}