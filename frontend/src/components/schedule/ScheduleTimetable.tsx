import { useMemo } from "react";
import { formatTo12Hour } from "../../utils/timeFormatter";

interface ScheduleItem {
  subjectCode: string;
  subjectName: string;
  section: string;
  units: number;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

interface ScheduleTimetableProps {
  data: ScheduleItem[];
  readOnly?: boolean;
  onEdit?: (schedule: ScheduleItem) => void;
  onDelete?: (schedule: ScheduleItem) => void;
}

const SLOT_H = 56;
const START_H = 7;
const TIME_LABELS = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function toMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function ScheduleTimetable({
  data,
  readOnly = true,
  onEdit,
  onDelete,
}: ScheduleTimetableProps) {
  const byDay = useMemo(() => {
    const m: Record<string, ScheduleItem[]> = {};
    DAYS.forEach((d) => {
      m[d] = [];
    });
    data.forEach((s) => {
      if (m[s.day]) m[s.day].push(s);
    });
    return m;
  }, [data]);

  const height = (s: string, e: string) =>
    Math.max(((toMins(e) - toMins(s)) / 60) * SLOT_H - 4, 28);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden w-full">
      {/* Header with day labels */}
      <div
        className="grid border-b border-gray-100 sticky top-0 bg-white z-10"
        style={{ gridTemplateColumns: `52px repeat(${DAYS.length},1fr)` }}
      >
        <div className="border-r border-gray-100" />
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-3 text-center text-xs font-bold text-gray-700 border-r border-gray-100"
          >
            {d.slice(0, 3)}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `52px repeat(${DAYS.length},1fr)`,
          minWidth: 0,
        }}
      >
        {/* Time labels column */}
        <div className="border-r border-gray-100">
          {TIME_LABELS.map((t) => (
            <div
              key={t}
              style={{ height: SLOT_H }}
              className="flex items-start justify-end pr-2 pt-1 text-[10px] text-gray-400 font-medium border-b border-gray-50"
            >
              {t}
            </div>
          ))}
        </div>

        {/* Day columns with schedule items */}
        {DAYS.map((day) => (
          <div
            key={day}
            className="relative border-r border-gray-100 overflow-hidden"
          >
            {/* Grid lines */}
            {TIME_LABELS.map((t, i) => (
              <div
                key={t}
                style={{ height: SLOT_H }}
                className={`border-b ${
                  i % 2 === 0
                    ? "border-gray-100"
                    : "border-dashed border-gray-50"
                } ${i % 2 !== 0 ? "bg-gray-50/40" : ""}`}
              />
            ))}

            {/* Schedule blocks */}
            {byDay[day].map((s) => {
              const blockH = height(s.startTime, s.endTime);
              const timeRange = `${formatTo12Hour(s.startTime)} – ${formatTo12Hour(s.endTime)}`;

              return (
                <div
                  key={`${s.subjectCode}-${s.section}-${s.day}`}
                  className="absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden group border-l-2 border-l-[#8B0000] bg-[#FFF3F3] hover:bg-[#FFE8E8] transition-colors"
                  style={{
                    top:
                      (toMins(s.startTime) - START_H * 60) * (SLOT_H / 60) + 2,
                    height: blockH - 4,
                  }}
                >
                  <p className="text-[10px] font-black text-[#8B0000] truncate">
                    {s.subjectCode}
                  </p>
                  {blockH > 30 && (
                    <p className="text-[9px] text-gray-700 truncate font-semibold">
                      {s.subjectName}
                    </p>
                  )}
                  {blockH > 38 && (
                    <p className="text-[10px] text-gray-600 truncate">
                      {s.section}
                    </p>
                  )}
                  {blockH > 50 && (
                    <p className="text-[9px] text-gray-500">{s.units} units</p>
                  )}
                  {blockH > 56 && (
                    <p className="text-[10px] text-gray-400">{timeRange}</p>
                  )}
                  {blockH > 72 && (
                    <p className="text-[10px] text-gray-400 truncate">
                      📍 {s.room}
                    </p>
                  )}
                  {blockH > 74 && !readOnly && (
                    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(s);
                        }}
                        className="flex-1 bg-[#8B0000] text-white text-[9px] font-bold rounded py-0.5"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(s);
                        }}
                        className="flex-1 bg-red-500 text-white text-[9px] font-bold rounded py-0.5"
                      >
                        Del
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
