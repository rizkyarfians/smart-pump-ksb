import pumpOverviewImg from '../../assets/pump-overview-4k.png';

const pumpMarkerPositions = [
  { pumpId: 1, label: 'Pump 1', left: '34.25%', top: '54%' },
  { pumpId: 2, label: 'Pump 2', left: '44.25%', top: '54%' },
  { pumpId: 3, label: 'Pump 3', left: '54.25%', top: '54%' },
  { pumpId: 4, label: 'Pump 4', left: '64.25%', top: '54%' },
];

export default function PumpOverviewCard({ pumps = [] }) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-100">
        <img
          src={pumpOverviewImg}
          alt="Pump overview"
          className="h-full w-full object-cover"
        />

        <div className="absolute left-5 top-4 z-10">
          <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-600" />

              <h2 className="text-lg font-bold leading-none text-slate-950">
                Pump Overview
              </h2>
            </div>

            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Station Monitoring
            </p>
          </div>
        </div>

        {pumpMarkerPositions.map((marker) => {
          const pump = pumps.find((item) => {
            const itemId = item.pumpId || item.id || item.no || item.number;

            return Number(itemId) === Number(marker.pumpId);
          });

          const status =
            pump?.status ||
            pump?.statusText ||
            (pump?.isRunning ? 'Running' : 'Stopped');

          return (
            <PumpStatusMarker
              key={marker.pumpId}
              label={marker.label}
              status={status}
              isRunning={Boolean(pump?.isRunning || pump?.running)}
              left={marker.left}
              top={marker.top}
            />
          );
        })}
      </div>
    </section>
  );
}

function PumpStatusMarker({ label, status, isRunning, left, top }) {
  const displayStatus = isRunning ? 'RUNNING' : normalizeStatusText(status);

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left, top }}
    >
      <div className="min-w-[74px] rounded-lg border border-white/70 bg-white/90 px-2.5 py-1.5 text-center shadow-sm backdrop-blur-sm">
        <div className="text-[11px] font-bold leading-none text-slate-900">
          {label}
        </div>

        <div className="mt-1 flex items-center justify-center gap-1">
          <StatusDot status={displayStatus} />

          <span
            className={
              isRunning
                ? 'text-[9px] font-bold uppercase leading-none text-emerald-700'
                : 'text-[9px] font-bold uppercase leading-none text-red-600'
            }
          >
            {displayStatus}
          </span>
        </div>
      </div>

      <div className="mx-auto mt-1 h-4 w-0.5 rounded-full bg-white/90 shadow-sm" />
    </div>
  );
}

function StatusDot({ status }) {
  const normalizedStatus = String(status).toLowerCase();

  const dotClass =
    normalizedStatus === 'running' ||
    normalizedStatus === 'run' ||
    normalizedStatus === 'on'
      ? 'bg-emerald-500'
      : normalizedStatus === 'stopped' ||
          normalizedStatus === 'stop' ||
          normalizedStatus === 'off'
        ? 'bg-red-500'
        : normalizedStatus === 'fault' ||
            normalizedStatus === 'alarm'
          ? 'bg-yellow-500'
          : 'bg-slate-400';

  return <span className={`h-2 w-2 rounded-full ${dotClass}`} />;
}

function normalizeStatusText(status) {
  const normalizedStatus = String(status || '').toLowerCase();

  if (
    normalizedStatus === 'running' ||
    normalizedStatus === 'run' ||
    normalizedStatus === 'on'
  ) {
    return 'RUNNING';
  }

  if (
    normalizedStatus === 'stopped' ||
    normalizedStatus === 'stop' ||
    normalizedStatus === 'off'
  ) {
    return 'STOPPED';
  }

  if (
    normalizedStatus === 'fault' ||
    normalizedStatus === 'alarm'
  ) {
    return 'FAULT';
  }

  return 'UNKNOWN';
}