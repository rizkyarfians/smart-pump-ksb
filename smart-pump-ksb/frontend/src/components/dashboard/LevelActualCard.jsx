import { useEffect, useState } from 'react';

import API from '../../services/api';
import { LEVEL_RANGES } from '../../data/dashboardData';

export default function LevelActualCard() {
  const [levelPercent, setLevelPercent] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [statusText, setStatusText] = useState('Waiting camera level');

  const [levelStatus, setLevelStatus] = useState({
    llActive: false,
    hlActive: false,
    activeLL: [],
    activeHL: [],
  });

  useEffect(() => {
    let active = true;

    async function fetchLevelData() {
      try {
        const [waterLevelRes, levelStatusRes] = await Promise.all([
          API.get('/modbus/water-level/latest'),
          API.get('/modbus/level-status'),
        ]);

        if (!active) return;

        if (waterLevelRes.data?.success) {
          const data = waterLevelRes.data.data || {};
          const nextLevel = Number(data.levelPercent || 0);

          setLevelPercent(Math.max(0, Math.min(100, nextLevel)));
          setUpdatedAt(data.updatedAt || null);
          setStatusText('Camera level');
        }

        if (levelStatusRes.data?.success) {
          const summary = levelStatusRes.data.data?.summary || {};

          setLevelStatus({
            llActive: Boolean(summary.llActive),
            hlActive: Boolean(summary.hlActive),
            activeLL: summary.activeLL || [],
            activeHL: summary.activeHL || [],
          });
        }
      } catch (err) {
        if (!active) return;

        console.log('Failed to fetch level data:', err);
        setStatusText('Camera level unavailable');
      }
    }

    fetchLevelData();

    const interval = setInterval(fetchLevelData, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const percentage = Math.min(100, Math.max(0, levelPercent));

  const getRangeClassName = (label) => {
    const normalized = String(label || '').toLowerCase();

    const isLowLow = normalized.includes('low low');
    const isHigh = normalized === 'high level';

    const isActive =
      (isLowLow && levelStatus.llActive) ||
      (isHigh && levelStatus.hlActive);

    if (!isActive) {
      return 'grid grid-cols-[minmax(0,1fr)_52px] gap-2';
    }

    return 'grid grid-cols-[minmax(0,1fr)_52px] gap-2 rounded-lg bg-red-50 px-2 py-1 text-red-700';
  };

  const activeStatusText =
    levelStatus.hlActive
      ? `HL Active: ${levelStatus.activeHL.map((item) => item.label).join(', ')}`
      : levelStatus.llActive
        ? `LL Active: ${levelStatus.activeLL.map((item) => item.label).join(', ')}`
        : 'LL / HL Normal';

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
            <div className="relative h-full w-9 overflow-hidden rounded-full bg-gradient-to-b from-sky-100 to-blue-900 shadow-inner">
              <div
                className="absolute bottom-0 left-0 w-full bg-gradient-to-b from-sky-400 to-blue-600 transition-all duration-500"
                style={{ height: `${percentage}%` }}
              />

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
              {percentage.toFixed(1)}%
            </div>

            <div className="mt-2 text-[11px] font-semibold uppercase text-slate-500">
              Level Actual
            </div>

            <div className="mt-1 text-[10px] font-bold text-slate-400">
              {statusText}
              {updatedAt ? ` · ${new Date(updatedAt).toLocaleTimeString()}` : ''}
            </div>

            <div
              className={`mt-2 text-[10px] font-black ${
                levelStatus.llActive || levelStatus.hlActive
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {activeStatusText}
            </div>
          </div>

          <div className="space-y-2 text-[11px]">
            {LEVEL_RANGES.map((item) => (
              <div
                key={item.label}
                className={getRangeClassName(item.label)}
              >
                <span className="truncate font-medium">
                  {item.label}
                </span>

                <span className="whitespace-nowrap text-right font-bold">
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