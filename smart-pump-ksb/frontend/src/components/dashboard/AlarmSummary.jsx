export default function AlarmSummary({ alarms = [] }) {
  const alarmCount = alarms.filter((item) => item.status === 'Active').length;
  const warningCount = alarms.filter((item) => item.severity === 'warning').length;
  const infoCount = alarms.filter((item) => item.severity === 'info').length;

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-bold uppercase text-slate-500">
        Alarm Summary
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 text-center">
        <SummaryItem
          icon="⚠"
          value={alarmCount}
          label="Alarm"
          className="text-orange-500"
        />

        <SummaryItem
          icon="▲"
          value={warningCount}
          label="Warning"
          className="text-red-500"
        />

        <SummaryItem
          icon="ℹ"
          value={infoCount}
          label="Information"
          className="text-blue-500"
        />
      </div>
    </div>
  );
}

function SummaryItem({ icon, value, label, className }) {
  return (
    <div className="flex items-center justify-center gap-3 px-3">
      <div className={`text-2xl font-black ${className}`}>
        {icon}
      </div>

      <div>
        <div className="text-3xl font-black leading-none text-slate-950">
          {value}
        </div>

        <div className="mt-1 text-[10px] font-bold uppercase text-slate-500">
          {label}
        </div>
      </div>
    </div>
  );
}