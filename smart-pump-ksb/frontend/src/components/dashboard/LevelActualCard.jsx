import { LEVEL_RANGES } from '../../data/dashboardData';

export default function LevelActualCard() {
  const level = 2.45;
  const maxLevel = 5.0;
  const percentage = Math.min(100, Math.max(0, (level / maxLevel) * 100));

  return (
    <div className="flex h-full min-h-0 items-center justify-center rounded-xl bg-white">
      <div className="grid w-full grid-cols-[88px_minmax(0,1fr)] gap-6">
        {/* Gauge */}
        <div className="grid grid-cols-[38px_1fr] gap-2">
          <div className="flex h-44 flex-col justify-between text-right text-xs font-medium text-slate-500">
            <span>5.0 m</span>
            <span>4.0 m</span>
            <span>3.0 m</span>
            <span>2.0 m</span>
            <span>1.0 m</span>
            <span>0.0 m</span>
          </div>

          <div className="relative flex h-50 items-center justify-center">
            {/* Rounded level bar */}
            <div className="relative h-full w-9 overflow-hidden rounded-full bg-gradient-to-b from-sky-100 to-blue-900 shadow-inner">
              {/* Actual level fill */}
              <div
                className="absolute bottom-0 left-0 w-full bg-gradient-to-b from-sky-400 to-blue-600"
                style={{ height: `${percentage}%` }}
              />

              {/* Tick marks */}
              {[20, 40, 60, 80].map((bottom) => (
                <div
                  key={bottom}
                  className="absolute left-1/2 z-10 h-[3px] w-4 -translate-x-1/2 rounded-full bg-white/90"
                  style={{ bottom: `${bottom}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0">
          <div className="mb-5 text-center">
            <div className="whitespace-nowrap text-4xl font-extrabold leading-none text-blue-600">
              {level.toFixed(2)} m
            </div>

            <div className="mt-2 text-[11px] font-semibold uppercase text-slate-500">
              Level Actual
            </div>
          </div>

          <div className="space-y-2 text-[11px]">
            {LEVEL_RANGES.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[minmax(0,1fr)_52px] gap-2"
              >
                <span className="truncate font-medium text-slate-700">
                  {item.label}
                </span>

                <span className="whitespace-nowrap text-right font-bold text-slate-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}