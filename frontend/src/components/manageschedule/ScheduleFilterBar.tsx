import { Search, LayoutGrid, TableProperties, DoorOpen } from "lucide-react";
import { inputCls } from "../common/Modal";
import { DAYS, FACULTY_LIST, ROOM_LIST, getFacultyName } from "../../utils/scheduleConflict";

interface ScheduleFilterBarProps {
  view: "list" | "timetable";
  onViewChange: (v: "list" | "timetable") => void;
  search: string;
  onSearchChange: (v: string) => void;
  filterDay: string;
  onFilterDayChange: (v: string) => void;
  filterFac: string;
  onFilterFacChange: (v: string) => void;
  filterProgram: string;
  onFilterProgramChange: (v: string) => void;
  filterRoom: string;
  onFilterRoomChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  sortOrder: string;
  onSortOrderChange: (v: string) => void;
}

export function ScheduleFilterBar({
  view,
  onViewChange,
  search,
  onSearchChange,
  filterDay,
  onFilterDayChange,
  filterFac,
  onFilterFacChange,
  filterProgram,
  onFilterProgramChange,
  filterRoom,
  onFilterRoomChange,
  filterStatus,
  onFilterStatusChange,
  sortOrder,
  onSortOrderChange,
}: ScheduleFilterBarProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
      {/* Search + View Toggle */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search faculty, subject code, or section..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ["list", "List", LayoutGrid],
              ["timetable", "Timetable", TableProperties],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                view === id
                  ? "bg-[#8B0000] border-[#8B0000] text-white"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Day */}
        <div className="flex items-center gap-2 flex-1 min-w-[130px]">
          <span className="text-xs text-gray-400 shrink-0">Day:</span>
          <select
            className={`${inputCls} cursor-pointer`}
            value={filterDay}
            onChange={(e) => onFilterDayChange(e.target.value)}
          >
            <option value="All">All Days</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Faculty */}
        <div className="flex items-center gap-2 flex-1 min-w-[170px]">
          <span className="text-xs text-gray-400 shrink-0">Faculty:</span>
          <select
            className={`${inputCls} cursor-pointer`}
            value={filterFac}
            onChange={(e) => onFilterFacChange(e.target.value)}
          >
            <option value="All">All Faculty</option>
            {FACULTY_LIST.map((f) => (
              <option key={f.id} value={f.id}>
                {getFacultyName(f as any)}
              </option>
            ))}
          </select>
        </div>

        {/* Program */}
        <div className="flex items-center gap-2 flex-1 min-w-[130px]">
          <span className="text-xs text-gray-400 shrink-0">Program:</span>
          <select
            className={`${inputCls} cursor-pointer`}
            value={filterProgram}
            onChange={(e) => onFilterProgramChange(e.target.value)}
          >
            <option value="All">All Programs</option>
            <option value="BSCS">BSCS</option>
            <option value="BSIT">BSIT</option>
            <option value="BSIS">BSIS</option>
          </select>
        </div>

        {/* Room */}
        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
          <span className="text-xs text-gray-400 shrink-0">
            <DoorOpen size={13} className="inline mr-1 text-gray-400" />
            Room:
          </span>
          <select
            className={`${inputCls} cursor-pointer`}
            value={filterRoom}
            onChange={(e) => onFilterRoomChange(e.target.value)}
          >
            <option value="All">All Rooms</option>
            {ROOM_LIST.map((r) => (
              <option key={r.id} value={r.id}>{(r as any).room}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <span className="text-xs text-gray-400 shrink-0">Status:</span>
          <select
            className={`${inputCls} cursor-pointer`}
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value)}
          >
            <option value="All">All Stages</option>
            <option value="draft">Draft</option>
            <option value="finalized">Finalized</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <span className="text-xs text-gray-400 shrink-0">Sort:</span>
          <select
            className={`${inputCls} cursor-pointer`}
            value={sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value)}
          >
            <option value="subject_asc">Subject (A - Z)</option>
            <option value="subject_desc">Subject (Z - A)</option>
          </select>
        </div>
      </div>
    </div>
  );
}