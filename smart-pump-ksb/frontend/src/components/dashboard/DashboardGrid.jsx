import LevelActualCard from './LevelActualCard';
import PumpOverviewCard from './PumpOverviewCard';
import PumpControlPanel from './PumpControlPanel';
import CameraCard from './CameraCard';
import AlarmPanel from './AlarmPanel';

export default function DashboardGrid({ pumps }) {
  return (
    <main
      className="
        grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto overflow-x-hidden
        lg:grid-cols-[320px_minmax(0,1fr)]
        2xl:grid-cols-[400px_minmax(560px,1fr)_340px]
        2xl:grid-rows-[1.15fr_0.85fr]
        2xl:gap-4
        2xl:overflow-hidden
      "
    >
      {/* Alarm Panel */}
      <div
        className="
          min-h-[260px]
          lg:col-start-1 lg:row-start-1
          2xl:col-start-1 2xl:row-start-1 2xl:min-h-0
        "
      >
        <AlarmPanel pumps={pumps} />
      </div>

      {/* Pump Overview */}
      <div
        className="
          min-h-[320px]
          lg:col-start-2 lg:row-start-1
          2xl:col-start-2 2xl:row-start-1 2xl:min-h-0
        "
      >
        <PumpOverviewCard pumps={pumps} />
      </div>

      {/* Water Level */}
      <section
        className="
          min-h-[300px] rounded-2xl bg-white p-4 shadow-sm
          lg:col-start-1 lg:row-start-2
          2xl:col-start-3 2xl:row-start-1 2xl:min-h-0 2xl:p-5
        "
      >
        <LevelActualCard />
      </section>

      {/* Camera */}
      <div
        className="
          min-h-[280px]
          lg:col-start-2 lg:row-start-2
          2xl:col-start-3 2xl:row-start-2 2xl:min-h-0
        "
      >
        <CameraCard />
      </div>

      {/* Pump Control */}
      <div
        className="
          min-h-[320px]
          lg:col-span-2 lg:col-start-1 lg:row-start-3
          2xl:col-span-2 2xl:col-start-1 2xl:row-start-2 2xl:min-h-0
        "
      >
        <PumpControlPanel pumps={pumps} />
      </div>
    </main>
  );
}