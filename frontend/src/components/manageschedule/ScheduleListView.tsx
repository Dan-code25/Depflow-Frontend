import { Pencil, Trash2, Users } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import {
  getFaculty,
  getSubject,
  getRoom,
  getFacultyName,
} from "../../utils/scheduleConflict";
import type { ScheduleAssignment } from "../../utils/geminiSchedHelper";

interface ScheduleListViewProps {
  data: ScheduleAssignment[];
  otherFacs?: any[];
  otherRooms?: any[];
  onEdit: (s: ScheduleAssignment) => void;
  onDelete: (s: ScheduleAssignment) => void;
}

function formatTime12h(timeStr: string): string {
  if (!timeStr || timeStr === "TBD") return "TBA";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export function ScheduleListView({
  data,
  otherFacs = [],
  otherRooms = [],
  onEdit,
  onDelete,
}: ScheduleListViewProps) {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden font-lexend shadow-sm">
      {/* Table Header */}
      <div className="hidden lg:grid grid-cols-[0.9fr_0.6fr_0.6fr_1.6fr_0.8fr_0.8fr_1.3fr_0.8fr] gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Subject Code</span>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Section</span>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Day</span>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Time</span>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Room</span>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide text-center">Status</span>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Faculty</span>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide text-right">Actions</span>
      </div>

      {/* List Rows */}
      <div className="divide-y divide-gray-50">
        {data.map((s) => {
          const f = getFaculty(s.faculty_id ?? "");
          const sub = getSubject(s.subject_id);
          const r = getRoom(s.room_id ?? "");
          const isGuest = !!s.other_faculty_id;
          const isUnassigned = s.faculty_id === "TBD" && !isGuest;
          const guestFacName =
            otherFacs.find((x: any) => x.id === s.other_faculty_id)?.faculty_name ||
            "Guest Faculty";
          const guestRoomName =
            otherRooms.find((x: any) => x.id === s.other_room_id)?.room_name ||
            "Guest Room";

          return (
            <div
              key={s.schedule_id}
              className="group hover:bg-gray-50/50 transition-colors relative"
            >
              {/* Hover accent line */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8B0000] opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="lg:grid lg:grid-cols-[0.9fr_0.6fr_0.6fr_1.6fr_0.8fr_0.8fr_1.3fr_0.8fr] flex flex-col gap-4 px-6 py-5 items-start lg:items-center">
                {/* Subject Code */}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#8B0000] uppercase tracking-tight">
                    {sub?.code}
                  </p>
                </div>

                {/* Section */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-700 uppercase">
                    {s.section}
                  </p>
                </div>

                {/* Day */}
                <div className="text-sm font-semibold text-gray-700">
                  {s.day === "TBD" ? (
                    <span className="text-amber-500 italic">TBA</span>
                  ) : (
                    s.day
                  )}
                </div>

                {/* Time */}
                <div className="text-sm font-semibold text-gray-700 uppercase whitespace-nowrap">
                  {s.start_time === "TBD" ? (
                    <span className="text-amber-500 italic">TBA</span>
                  ) : (
                    `${formatTime12h(s.start_time)} - ${formatTime12h(s.end_time)}`
                  )}
                </div>

                {/* Room */}
                <div className="text-sm text-gray-700 truncate">
                  {s.other_room_id ? (
                    guestRoomName
                  ) : r?.room ? (
                    r.room
                  ) : (
                    <span className="text-amber-500 italic">TBA</span>
                  )}
                </div>

                {/* Status */}
                <div className="lg:text-center w-full lg:w-auto">
                  <StatusBadge status={s.status} />
                </div>

                {/* Faculty */}
                <div className="min-w-0 w-full lg:w-auto">
                  {isUnassigned ? (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 w-fit">
                      <Users size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        Needs Faculty
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-gray-700 truncate">
                      {isGuest ? guestFacName : getFacultyName(f)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 w-full lg:w-auto opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(s)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(s)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}