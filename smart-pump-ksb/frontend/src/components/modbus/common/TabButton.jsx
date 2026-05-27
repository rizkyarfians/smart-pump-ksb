export default function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'border-b-2 border-blue-700 px-4 py-3 text-sm font-bold text-blue-700'
          : 'border-b-2 border-transparent px-4 py-3 text-sm font-bold text-slate-500 transition hover:text-slate-900'
      }
    >
      {label}
    </button>
  );
}