export default function AlarmTable({ alarms = [] }) {
  return (
    <div className="h-full overflow-hidden rounded-xl border border-slate-300">
      <div className="max-h-full overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase text-slate-700">
            <tr>
              <th className="px-3 py-3">No</th>
              <th className="px-3 py-3">Alarm Text</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {alarms.map((alarm, index) => (
              <tr key={alarm.id} className="border-t border-slate-100">
                <td className="px-3 py-3 text-slate-700">
                  {index + 1}
                </td>

                <td className="px-3 py-3 font-semibold text-slate-800">
                  {alarm.alarmText}
                </td>

                <td className="px-3 py-3 text-slate-700">
                  {alarm.date}
                </td>

                <td className="px-3 py-3 text-slate-700">
                  {alarm.time}
                </td>

                <td className="px-3 py-3">
                  <span className="rounded-full border border-emerald-500 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600">
                    {alarm.status}
                  </span>
                </td>
              </tr>
            ))}

            {alarms.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="px-3 py-10 text-center text-sm font-semibold text-slate-400"
                >
                  No active alarm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}