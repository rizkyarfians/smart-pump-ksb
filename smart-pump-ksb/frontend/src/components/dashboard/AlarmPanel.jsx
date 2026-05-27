import AlarmSummary from './AlarmSummary';
import AlarmTable from './AlarmTable';

export default function AlarmPanel({ pumps = [] }) {
  const alarms = buildAlarmRows(pumps);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-sm">
      <AlarmSummary alarms={alarms} />

      <div className="mt-4 min-h-0 flex-1">
        <AlarmTable alarms={alarms} />
      </div>
    </section>
  );
}

function buildAlarmRows(pumps) {
  const rows = [];

  pumps.forEach((pump) => {
    const activeAlarms = pump.activeAlarms || [];

    activeAlarms.forEach((alarm) => {
      const dateTime = parseDateTime(pump.lastUpdate);

      rows.push({
        id: `${pump.id}-${alarm.key}`,
        pumpId: pump.id,
        alarmText: `${pump.name || pump.pump_name || `Pump ${pump.no}`} ${alarm.label}`,
        date: dateTime.date,
        time: dateTime.time,
        status: 'Active',
        severity: alarm.severity || 'alarm',
      });
    });
  });

  return rows;
}

function parseDateTime(value) {
  if (!value) {
    return {
      date: '-',
      time: '-',
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: '-',
      time: '-',
    };
  }

  return {
    date: date.toLocaleDateString('id-ID'),
    time: date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}