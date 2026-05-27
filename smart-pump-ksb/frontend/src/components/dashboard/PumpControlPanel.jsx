import PumpControlRow from './PumpControlRow';

export default function PumpControlPanel({ pumps }) {
  
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h2 className="text-lg font-bold text-slate-950">
          Pump Control
        </h2>

        <span className="text-xs font-medium text-slate-400">
          Manual / Auto Operation
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-4 gap-2">
        {pumps.map((pump, index) => (
          <PumpControlRow
  key={pump.id || pump.pumpId || index}
  pumpId={pump.pumpId || pump.id}
  number={pump.number || index + 1}
  name={pump.name || pump.pump_name}
  mode={pump.mode || 'Auto'}
  runHour={
  pump.runHour ??
  pump.run_hour ??
  pump.vsdRunHour ??
  pump.vsd_run_hour ??
  pump.runHourValue ??
  '-'
}
  power={pump.power}
  powerUnit={pump.powerUnit}
  current={pump.current}
  currentUnit={pump.currentUnit}
  voltage={pump.voltage}
  voltageUnit={pump.voltageUnit}
  speedActual={pump.speedActual}
  speedActualUnit={pump.speedActualUnit}
/>
        ))}
      </div>
    </section>
  );
}