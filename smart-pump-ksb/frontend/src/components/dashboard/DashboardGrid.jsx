import LevelActualCard from './LevelActualCard';
import PumpOverviewCard from './PumpOverviewCard';
import PumpControlPanel from './PumpControlPanel';
import CameraCard from './CameraCard';
import AlarmPanel from './AlarmPanel';

export default function DashboardGrid({ pumps }) {
  return (
    <main className="grid min-h-0 flex-1 grid-cols-[400px_minmax(560px,1fr)_340px] grid-rows-[1.15fr_0.85fr] gap-4 overflow-hidden">
      {/* Left Top: Alarm Panel */}
      <div className="col-start-1 row-start-1 min-h-0">
        <AlarmPanel pumps={pumps} />
      </div>

      {/* Center Top: Pump Overview */}
      <div className="col-start-2 row-start-1 min-h-0">
        <PumpOverviewCard pumps={pumps} />
      </div>

      {/* Right Top: Water Level */}
      <section className="col-start-3 row-start-1 min-h-0 rounded-2xl bg-white p-5 shadow-sm">
        <LevelActualCard />
      </section>

      {/* Right Bottom: Camera */}
      <div className="col-start-3 row-start-2 min-h-0">
        <CameraCard />
      </div>

      {/* Bottom: Pump Control */}
      <div className="col-span-2 col-start-1 row-start-2 min-h-0">
        <PumpControlPanel pumps={pumps} />
      </div>
    </main>
  );
}