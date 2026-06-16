import type { ScheduleStatus } from "../../utils/scheduleConflict";

export function StatusBadge({ status }: { status: ScheduleStatus }) {
  if (status === "published")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
        Published
      </span>
    );
  if (status === "finalized")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block" />
        Finalized
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Draft
    </span>
  );
}