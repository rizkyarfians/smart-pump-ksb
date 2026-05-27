export default function InfoCard({ title, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase text-slate-400">
        {title}
      </div>

      <div className="mt-2 text-lg font-bold text-slate-950">
        {value}
      </div>
    </div>
  );
}