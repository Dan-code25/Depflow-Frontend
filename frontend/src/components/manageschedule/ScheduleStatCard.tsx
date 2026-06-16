interface ScheduleStatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub?: string;
}

export function ScheduleStatCard({ label, value, icon, sub }: ScheduleStatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all hover:border-burgundy cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="bg-burgundy rounded-full p-4 flex-shrink-0 flex items-center justify-center text-white">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
            {label}
          </h3>
          <p className="text-4xl font-bold text-burgundy mb-2">{value}</p>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
    </div>
  );
}