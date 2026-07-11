export default function StatCard({ label, value, sub, icon: Icon, accent = "blue", testid }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  }[accent];

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between hover:shadow-sm transition-shadow"
      data-testid={testid}
    >
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </div>
        <div className="text-2xl md:text-3xl font-semibold text-slate-900 adult-heading mt-1">
          {value}
        </div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-lg grid place-items-center ring-1 ${colors}`}>
          <Icon size={18} />
        </div>
      )}
    </div>
  );
}
