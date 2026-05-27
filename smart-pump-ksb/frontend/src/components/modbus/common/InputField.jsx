export default function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  suffix,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <div className="flex h-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-slate-800 outline-none"
        />

        {suffix && (
          <div className="flex h-full items-center px-4 text-xs font-bold text-slate-400">
            {suffix}
          </div>
        )}
      </div>
    </label>
  );
}