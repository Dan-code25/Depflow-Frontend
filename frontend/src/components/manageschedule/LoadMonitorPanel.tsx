import {
  FACULTY_LIST,
  HOURS_PER_UNIT,
  getTotalUnits,
  getFacultyMaxUnits,
  getFacultyName,
} from "../../utils/scheduleConflict";
import type { ScheduleAssignment } from "../../utils/geminiSchedHelper";
import placeholderImg from "../../assets/profile-placeholder.svg";

interface LoadMonitorPanelProps {
  sched: ScheduleAssignment[];
}

export function LoadMonitorPanel({ sched }: LoadMonitorPanelProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <p className="text-sm font-bold text-gray-900 mb-0.5">Load Monitor</p>
      <p className="text-xs text-gray-400 mb-4">Units assigned this semester</p>

      <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
        {FACULTY_LIST.map((f) => {
          const u = getTotalUnits(sched, f.id);
          const maxUnits = getFacultyMaxUnits(f);
          const pct = Math.min((u / maxUnits) * 100, 100);
          const barColor =
            pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-amber-400" : "bg-green-500";
          const valColor =
            pct >= 100
              ? "text-red-600"
              : pct >= 85
                ? "text-amber-600"
                : "text-green-600";

          return (
            <div key={f.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={f?.photo_url || placeholderImg}
                  className="w-7 h-7 rounded-full object-cover border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = placeholderImg;
                    e.currentTarget.onerror = null;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {getFacultyName(f)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {f.personal.employmentType}
                  </p>
                </div>
                <span className={`text-sm font-black ${valColor}`}>
                  {u}
                  <span className="text-[10px] text-gray-400 font-normal">
                    /{maxUnits}
                  </span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-xl text-[11px] text-gray-500 leading-loose">
        🟢 Under 85% — Balanced
        <br />
        🟡 85–99% — Near limit
        <br />
        🔴 100%+ — Overloaded
      </div>

      <div className="mt-2 p-3 bg-[#FFF3F3] border border-primary/10 rounded-xl text-[11px] text-gray-500 leading-loose">
        <p className="font-bold text-primary mb-1">Unit/Hour Rule</p>
        1 unit = {HOURS_PER_UNIT} hr of class time
        <br />
        Exceeding this flags a{" "}
        <span className="font-bold text-red-600">Hard Conflict</span>
      </div>
    </div>
  );
}