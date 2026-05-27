import { useState } from 'react';

import { DUMMY_CONTROL_URL } from '../../data/dashboardData';

export default function PumpControlCard({
  pumpId,
  number,
  name,
  mode,
}) {
  const [speedRef, setSpeedRef] = useState('');
  const [loadingCommand, setLoadingCommand] = useState(null);

  const isAuto = mode.toLowerCase() === 'auto';

  const sendCommand = async (command) => {
    try {
      setLoadingCommand(command);

      const payload = {
        pumpId,
        pumpName: name,
        command,
        speedRef,
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(DUMMY_CONTROL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('Command sent:', data);
    } catch (err) {
      console.log('Failed to send command:', err);
    } finally {
      setLoadingCommand(null);
    }
  };

  return (
    <article className="min-h-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-full min-h-0 flex-col">
        {/* Header */}
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-400 text-sm font-bold text-white">
              {number}
            </span>

            <h3 className="truncate text-base font-semibold text-slate-950">
              {name}
            </h3>
          </div>

          <ModePill
            mode={mode}
            isAuto={isAuto}
          />
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-[44px_minmax(0,1fr)_82px] gap-3">
          <PumpVisual />

          <div className="flex min-h-0 min-w-0 flex-col justify-center">
            <div className="space-y-1.5 text-[11px]">
              <InfoRow label="Run Hour" value="12:00:00" />
              <InfoRow label="Power" value="112.2 kW" />
              <InfoRow label="Current" value="198 A" />
              <InfoRow label="Voltage" value="400.0 V" />
              <InfoRow label="Speed" value="1450 RPM" />
            </div>

            <div className="mt-3 grid grid-cols-[1fr_50px] gap-2">
              <input
                type="number"
                value={speedRef}
                onChange={(e) => setSpeedRef(e.target.value)}
                placeholder="Speed"
                className="h-8 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 outline-none transition focus:border-blue-500"
              />

              <button
                type="button"
                onClick={() => sendCommand('SUBMIT_SPEED_REF')}
                disabled={loadingCommand !== null}
                className="h-8 rounded-lg bg-blue-700 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingCommand === 'SUBMIT_SPEED_REF' ? '...' : 'OK'}
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-col justify-center gap-3">
            <button
              type="button"
              onClick={() => sendCommand('START')}
              disabled={loadingCommand !== null}
              className="h-10 rounded-xl bg-emerald-500 text-xs font-extrabold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingCommand === 'START' ? '...' : 'START'}
            </button>

            <button
              type="button"
              onClick={() => sendCommand('STOP')}
              disabled={loadingCommand !== null}
              className="h-10 rounded-xl bg-red-600 text-xs font-extrabold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingCommand === 'STOP' ? '...' : 'STOP'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function PumpVisual() {
  return (
    <div className="flex h-full min-h-0 items-end justify-center py-1">
      <div className="relative h-full w-10 overflow-hidden">
        <div className="absolute bottom-0 left-1/2 h-[90%] w-4 -translate-x-1/2 rounded-t-full bg-blue-500/75" />

        <div className="absolute bottom-0 left-1/2 h-[42%] w-10 -translate-x-1/2 bg-blue-400/35" />
      </div>
    </div>
  );
}

function ModePill({ mode, isAuto }) {
  return (
    <div
      className={
        isAuto
          ? 'flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600'
          : 'flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500'
      }
    >
      <span>{mode}</span>

      <span
        className={
          isAuto
            ? 'h-2 w-2 rounded-full bg-emerald-500'
            : 'h-2 w-2 rounded-full bg-slate-300'
        }
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-[58px_1fr] items-center gap-2">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="whitespace-nowrap text-right font-semibold text-slate-950">
        {value}
      </span>
    </div>
  );
}