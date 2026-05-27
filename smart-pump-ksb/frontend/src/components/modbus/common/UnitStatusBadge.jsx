export default function UnitStatusBadge({ connectionStatus }) {
  if (connectionStatus === 'connected') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
        Connected
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
      Disconnected
    </span>
  );
}