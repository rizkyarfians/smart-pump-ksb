export default function StatusBadge({ status }) {
  const isActive = status === 'Active';

  const badgeClass = isActive
    ? 'border-green-400 bg-green-100 text-green-700'
    : 'border-red-400 bg-red-100 text-red-700';

  return (
    <span
      className={`inline-flex min-w-[52px] justify-center rounded-full border px-1.5 py-0.5 text-[8px] font-semibold leading-tight ${badgeClass}`}
    >
      {status}
    </span>
  );
}