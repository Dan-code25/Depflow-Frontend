import { useState, useMemo } from "react";
import {
  DAYS,
  FACULTY_LIST,
  toMins,
  getAvatarColor,
  getFaculty,
  getSubject,
  getRoom,
  getFacultyInitials,
  getFacultyName,
} from "../../utils/scheduleConflict";
import type { ScheduleAssignment } from "../../utils/geminiSchedHelper";

const SLOT_H = 56;
const START_H = 7;
const TIME_LABELS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00",
];
const SNAP_MINS = 30;
const PIXELS_PER_MIN = SLOT_H / 60;

interface ScheduleTimetableViewProps {
  data: ScheduleAssignment[];
  otherFacs?: any[];
  otherRooms?: any[];
  onEdit: (s: ScheduleAssignment) => void;
  onDelete: (s: ScheduleAssignment) => void;
}

export function ScheduleTimetableView({
  data,
  onEdit,
  onDelete,
}: ScheduleTimetableViewProps) {
  const [ghost, setGhost] = useState<{
    day: string;
    start: string;
    end: string;
  } | null>(null);
  const [draggedItem, setDraggedItem] = useState<ScheduleAssignment | null>(null);

  const byDay = useMemo(() => {
    const m: Record<string, ScheduleAssignment[]> = {};
    DAYS.forEach((d) => { m[d] = []; });
    data.forEach((s) => { if (m[s.day]) m[s.day].push(s); });
    return m;
  }, [data]);

  const handleDragStart = (e: React.DragEvent, s: ScheduleAssignment) => {
    setDraggedItem(s);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, day: string) => {
    e.preventDefault();
    if (!draggedItem) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const rawMins = (mouseY / SLOT_H) * 60;
    const snappedMins = Math.round(rawMins / SNAP_MINS) * SNAP_MINS;
    const startTotalMins = START_H * 60 + snappedMins;
    const duration = toMins(draggedItem.end_time) - toMins(draggedItem.start_time);
    const toHHMM = (m: number) =>
      `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
    const newStart = toHHMM(startTotalMins);
    const newEnd = toHHMM(startTotalMins + duration);
    if (ghost?.day !== day || ghost?.start !== newStart) {
      setGhost({ day, start: newStart, end: newEnd });
    }
  };

  const handleDrop = () => {
    if (!ghost || !draggedItem) return;
    onEdit({ ...draggedItem, day: ghost.day, start_time: ghost.start, end_time: ghost.end });
    setGhost(null);
    setDraggedItem(null);
  };

  const getBlockHeight = (s: string, e: string) =>
    Math.max(((toMins(e) - toMins(s)) / 60) * SLOT_H - 4, 28);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden w-full">
      {/* Day Headers */}
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

      {/* Grid Body */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `52px repeat(${DAYS.length},1fr)`, minWidth: 0 }}
      >
        {/* Time Labels Column */}
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

        {/* Day Columns */}
        {DAYS.map((day) => (
          <div
            key={day}
            className="relative border-r border-gray-100 overflow-hidden"
            onDragOver={(e) => handleDragOver(e, day)}
            onDrop={handleDrop}
            onDragLeave={() => setGhost(null)}
          >
            {/* Time slot grid lines */}
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

            {/* Drag Ghost */}
            {ghost && ghost.day === day && (
              <div
                className="absolute left-1 right-1 rounded-lg border-2 border-dashed border-[#8B0000] bg-[#8B0000]/5 z-0 pointer-events-none"
                style={{
                  top: (toMins(ghost.start) - START_H * 60) * PIXELS_PER_MIN + 2,
                  height:
                    (toMins(ghost.end) - toMins(ghost.start)) * PIXELS_PER_MIN - 4,
                }}
              />
            )}

            {/* Schedule Blocks */}
            {byDay[day].map((s) => {
              const f = getFaculty(s.faculty_id ?? "");
              const sub = getSubject(s.subject_id);
              const r = getRoom(s.room_id ?? "");
              const blockH = getBlockHeight(s.start_time, s.end_time);
              return (
                <div
                  key={s.schedule_id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, s)}
                  className={`absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden cursor-pointer group border-l-2 border-l-[#8B0000] bg-[#FFF3F3] hover:bg-[#FFE8E8] transition-colors ${
                    draggedItem?.schedule_id === s.schedule_id ? "opacity-20" : ""
                  }`}
                  style={{
                    top: (toMins(s.start_time) - START_H * 60) * PIXELS_PER_MIN + 2,
                    height: blockH - 4,
                  }}
                >
                  <p className="text-[10px] font-black text-[#8B0000] truncate">
                    {sub?.code}
                  </p>
                  {blockH > 38 && (
                    <p className="text-[10px] text-gray-600 truncate">
                      {getFacultyInitials(f)} · {s.section}
                    </p>
                  )}
                  {blockH > 56 && (
                    <p className="text-[10px] text-gray-400">
                      {s.start_time}–{s.end_time}
                    </p>
                  )}
                  {blockH > 72 && (
                    <p className="text-[10px] text-gray-400 truncate">
                      📍 {r?.other_room ?? "No room"}
                    </p>
                  )}
                  {blockH > 74 && (
                    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(s); }}
                        className="flex-1 bg-[#8B0000] text-white text-[9px] font-bold rounded py-0.5 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(s); }}
                        className="flex-1 bg-red-500 text-white text-[9px] font-bold rounded py-0.5 cursor-pointer"
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

      {/* Faculty Legend */}
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-4">
        {FACULTY_LIST.map((f) => (
          <div key={f.id} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className={`w-2.5 h-2.5 rounded-sm ${getAvatarColor(f)}`} />
            {getFacultyName(f)}
          </div>
        ))}
      </div>
    </div>
  );
}