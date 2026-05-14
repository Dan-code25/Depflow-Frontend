// ─────────────────────────────────────────────────────────────────────────────
// AdminManageSchedule.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { AdminLayout } from "../../components/layout/AdminLayout";
import api from "../../services/api";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  LayoutGrid,
  TableProperties,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  X,
  Users,
  CalendarDays,
  BookOpen,
  Clock,
  DoorOpen,
  Info,
} from "lucide-react";

import {
  enrichConflictsWithGemini,
  type ValidationContext,
  validateFullScheduleAdherence,
} from "../../utils/geminiSchedule";
import {
  generateSchedule,
  type ScheduleAssignment,
} from "../../utils/geminiSchedHelper";

// Import everything needed from our utility file
import {
  type ScheduleStatus,
  type Conflict,
  type ConflictTransfer,
  FACULTY_LIST,
  SUBJECT_LIST,
  ROOM_LIST,
  DAYS,
  HOURS_PER_UNIT,
  getAvatarColor,
  getFaculty,
  getSubject,
  getRoom,
  getFacultyInitials,
  getFacultyName,
  toMins,
  getTotalUnits,
  getFacultyMaxUnits,
  getDurationHours,
  isHourUnitMatch,
  buildGeminiContext,
  runConflictScan,
  categorizeByFixability,
  resolveConflictsDeterministically,
  isExternalSubject,
} from "../../utils/scheduleConflict";

import placeholderImg from "../../assets/profile-placeholder.svg";

// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLE UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ScheduleStatus }) {
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

function ConflictBadge({ type }: { type: "HARD" | "SOFT" }) {
  return type === "HARD" ? (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
      🔴 Hard
    </span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
      🟡 Soft
    </span>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white font-lexend";

function Modal({
  title,
  onClose,
  maxWidth = "max-w-lg",
  children,
}: {
  title: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className={`bg-white rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl font-lexend`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOCK TIME PICKER & FORMS (Minified for readability)
// ─────────────────────────────────────────────────────────────────────────────

function TimePickerClock({
  value,
  onChange,
  minTime,
  placeholder = "Select time...",
}: any) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const parseTime = (t: string) => {
    if (!t) return { h: 7, m: 0 };
    const [h, m] = t.split(":").map(Number);
    return { h, m };
  };
  const { h, m } = parseTime(value);
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm: "AM" | "PM" = h < 12 ? "AM" : "PM";
  const buildTime = (dh: number, period: "AM" | "PM", mins: number) => {
    let h24 = dh;
    if (period === "PM" && dh !== 12) h24 = dh + 12;
    if (period === "AM" && dh === 12) h24 = 0;
    return `${String(h24).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };
  const selectHour = (hour: number) => {
    onChange(buildTime(hour, ampm, m));
    setMode("minute");
  };
  const selectMinute = (min: number) => {
    onChange(buildTime(displayHour, ampm, min));
    setOpen(false);
    setMode("hour");
  };
  const toggleAmPm = (period: "AM" | "PM") => {
    onChange(buildTime(displayHour, period, m));
  };
  const isBelowMin = (newVal: string) => {
    if (!minTime || !newVal) return false;
    return newVal <= minTime;
  };

  const SIZE = 208;
  const CENTER = SIZE / 2;
  const RADIUS = 78;
  const BTN = 32;
  const getPos = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: CENTER + RADIUS * Math.cos(angle) - BTN / 2,
      y: CENTER + RADIUS * Math.sin(angle) - BTN / 2,
    };
  };
  const handRotation =
    mode === "hour" ? ((displayHour % 12) / 12) * 360 : (m / 60) * 360;
  const handLength = RADIUS - 14;
  const displayValue = value
    ? `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`
    : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setMode("hour");
        }}
        className={`${inputCls} flex items-center justify-between gap-2`}
      >
        <span className={displayValue ? "text-gray-800" : "text-gray-400"}>
          {displayValue ?? placeholder}
        </span>
        <Clock size={15} className="text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 p-4 w-[232px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setMode("hour")}
                className={`text-[22px] font-black px-1.5 py-0.5 rounded-lg transition-colors ${mode === "hour" ? "bg-[#FFF3F3] text-primary" : "text-gray-400 hover:bg-gray-50"}`}
              >
                {String(displayHour).padStart(2, "0")}
              </button>
              <span className="text-[22px] font-black text-gray-200 select-none">
                :
              </span>
              <button
                onClick={() => setMode("minute")}
                className={`text-[22px] font-black px-1.5 py-0.5 rounded-lg transition-colors ${mode === "minute" ? "bg-[#FFF3F3] text-primary" : "text-gray-400 hover:bg-gray-50"}`}
              >
                {String(m).padStart(2, "0")}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {(["AM", "PM"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => toggleAmPm(period)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors ${ampm === period ? "bg-[#8B0000] text-white" : "text-gray-400 hover:bg-gray-100"}`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-semibold mb-2">
            {mode === "hour" ? "Select Hour" : "Select Minute"}
          </p>
          <div
            className="relative mx-auto"
            style={{ width: SIZE, height: SIZE }}
          >
            <div className="absolute inset-0 rounded-full bg-gray-50 border-2 border-gray-100" />
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = (i / 60) * 360;
              const isMajor = i % 5 === 0;
              return (
                <div
                  key={i}
                  className={`absolute ${isMajor ? "bg-gray-300" : "bg-gray-200"}`}
                  style={{
                    width: isMajor ? 2 : 1,
                    height: isMajor ? 8 : 5,
                    left: CENTER - (isMajor ? 1 : 0.5),
                    top: 6,
                    transformOrigin: `50% ${CENTER - 6}px`,
                    transform: `rotate(${angle}deg)`,
                  }}
                />
              );
            })}
            <div
              className="absolute bg-[#8B0000] rounded-full"
              style={{
                width: 3,
                height: handLength,
                left: CENTER - 1.5,
                top: CENTER - handLength,
                transformOrigin: "50% 100%",
                transform: `rotate(${handRotation}deg)`,
                transition: "transform 0.15s ease",
              }}
            />
            <div
              className="absolute bg-[#8B0000] rounded-full z-10"
              style={{ width: 8, height: 8, left: CENTER - 4, top: CENTER - 4 }}
            />
            {mode === "hour" &&
              [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour, idx) => {
                const pos = getPos(idx, 12);
                const isSelected = hour === displayHour;
                const wouldBeInvalid = isBelowMin(buildTime(hour, ampm, m));
                return (
                  <button
                    key={hour}
                    onClick={() => !wouldBeInvalid && selectHour(hour)}
                    disabled={wouldBeInvalid}
                    className={`absolute w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-all ${isSelected ? "bg-[#8B0000] text-white shadow-md scale-110" : wouldBeInvalid ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-[#FFF3F3] hover:text-[#8B0000]"}`}
                    style={{ left: pos.x, top: pos.y }}
                  >
                    {hour}
                  </button>
                );
              })}
            {mode === "minute" &&
              [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min, idx) => {
                const pos = getPos(idx, 12);
                const isSelected = m === min;
                const wouldBeInvalid = isBelowMin(
                  buildTime(displayHour, ampm, min),
                );
                return (
                  <button
                    key={min}
                    onClick={() => !wouldBeInvalid && selectMinute(min)}
                    disabled={wouldBeInvalid}
                    className={`absolute w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${isSelected ? "bg-[#8B0000] text-white shadow-md scale-110" : wouldBeInvalid ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-[#FFF3F3] hover:text-[#8B0000]"}`}
                    style={{ left: pos.x, top: pos.y }}
                  >
                    {String(min).padStart(2, "0")}
                  </button>
                );
              })}
          </div>
          {mode === "minute" && (
            <button
              onClick={() => {
                setOpen(false);
                setMode("hour");
              }}
              className="w-full mt-3 py-2 bg-[#8B0000] hover:bg-[#6B0000] text-white rounded-xl text-xs font-bold transition-colors"
            >
              Confirm Time
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM: Omit<ScheduleAssignment, "schedule_id"> = {
  faculty_id: "",
  other_faculty_id: null, // ← ADD THIS
  subject_id: "",
  room_id: "",
  other_room_id: null, // ← ADD THIS
  day: "",
  start_time: "",
  end_time: "",
  section: "",
  status: "draft",
};

function ScheduleFormModal({
  editing,
  onSave,
  onClose,
  activeSem,
  curriculums,
  otherFacs = [],
  otherRooms = [],
}: any) {
  const [form, setForm] = useState<Omit<ScheduleAssignment, "id">>(
    editing
      ? {
          ...editing,
          faculty_id: editing.other_faculty_id
            ? "OTHER"
            : editing.faculty_id || "TBD",
          room_id: editing.other_room_id ? "OTHER" : editing.room_id || "TBD",
        }
      : { ...EMPTY_FORM },
  );
  const getInitialName = (id: string | null, list: any[], key: string) =>
    id ? list.find((x: any) => x.id === id)?.[key] || "" : "";

  const [customFac, setCustomFac] = useState(
    getInitialName(editing?.other_faculty_id, otherFacs, "faculty_name"),
  );
  const [customRoom, setCustomRoom] = useState(
    getInitialName(editing?.other_room_id, otherRooms, "room_name"),
  );

  const displayFacId = form.other_faculty_id
    ? "OTHER"
    : form.faculty_id || "TBD";
  const displayRoomId = form.other_room_id ? "OTHER" : form.room_id || "TBD";

  const formattedSY = parseInt(
    (activeSem.schoolYear.split("-")[0]?.slice(-2) || "") +
      (activeSem.schoolYear.split("-")[1]?.slice(-2) || ""),
  );

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Validation Rules
  const isValid = !!(
    form.subject_id &&
    form.section &&
    (form.faculty_id !== "OTHER" || customFac.trim() !== "") &&
    (form.room_id !== "OTHER" || customRoom.trim() !== "")
  );

  const selectedSubject = getSubject(form.subject_id) as any;
  const isLabSubject = selectedSubject?.facilityType === "lab";
  const expectedHours = isLabSubject
    ? (selectedSubject?.units ?? 1) * 2
    : (selectedSubject?.units ?? 0) * HOURS_PER_UNIT;
  const durationHours = getDurationHours(form.start_time, form.end_time);
  const hoursMismatch = !!(
    form.start_time &&
    form.end_time &&
    selectedSubject &&
    !isHourUnitMatch(
      form.start_time,
      form.end_time,
      selectedSubject.units,
      selectedSubject.facilityType,
    )
  );

  const availableSubjects = useMemo(() => {
    const filtered = SUBJECT_LIST.filter((s) => {
      if (s.semester) {
        return Number(s.semester) === Number(activeSem.sem);
      }
      return true;
    });

    return filtered.sort((a, b) => a.code.localeCompare(b.code));
  }, [activeSem.sem]);

  // Extract relevant sections based on database curriculum & active semester
  const availableSections = useMemo(() => {
    const sections: { label: string; subjectIds: string[] }[] = [];

    curriculums.forEach((prog: any) => {
      const termSubs = prog.termSubjects || [];

      prog.sections.forEach((sec: any) => {
        // First check if the section belongs to this School Year
        if (Number(sec.school_year) === formattedSY) {
          // Cross-reference: Find the subjects for this section's Year Level AND the Active Semester
          const matchedTerm = termSubs.find(
            (t: any) =>
              Number(t.year_level) === Number(sec.yearLevel) &&
              Number(t.semester) === Number(activeSem.sem),
          );

          // Extract the JSONB array (subject_codes) from the database
          const subjectIds = matchedTerm ? matchedTerm.subject_codes || [] : [];

          sections.push({ label: sec.label, subjectIds: subjectIds });
        }
      });
    });

    // Sort sections alphabetically (e.g., BSCS 1-A, BSCS 1-B...)
    return sections.sort((a, b) => a.label.localeCompare(b.label));
  }, [curriculums, activeSem.schoolYear, activeSem.sem]);

  // Curriculum Checker
  const curriculumWarning = useMemo(() => {
    if (!form.section || !form.subject_id) return null;
    const selectedSec = availableSections.find((s) => s.label === form.section);

    if (selectedSec && !selectedSec.subjectIds.includes(form.subject_id)) {
      const sub = getSubject(form.subject_id);
      return `Warning: ${sub?.code} is not part of the standard curriculum for ${form.section} this semester.`;
    }
    return null;
  }, [form.section, form.subject_id, availableSections]);

  useEffect(() => {
    if (editing?.other_faculty_id && !customFac) {
      setCustomFac(
        getInitialName(editing.other_faculty_id, otherFacs, "faculty_name"),
      );
    }
    if (editing?.other_room_id && !customRoom) {
      setCustomRoom(
        getInitialName(editing.other_room_id, otherRooms, "room_name"),
      );
    }
  }, [otherFacs, otherRooms, editing]);

  return (
    <Modal
      title={editing ? "Edit Assignment" : "Add Assignment"}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {/* Subject */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Subject <span className="text-red-500">*</span>
          </label>
          <select
            className={`${inputCls} cursor-pointer`}
            value={form.subject_id}
            onChange={(e) => set("subject_id", e.target.value)}
          >
            <option value="">Select subject...</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name} ({s.units} units)
              </option>
            ))}
          </select>
        </div>

        {/* Section (Database Driven ONLY) */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Section <span className="text-red-500">*</span>
          </label>
          <select
            className={`${inputCls} cursor-pointer`}
            value={form.section}
            onChange={(e) => set("section", e.target.value)}
          >
            <option value="">Select section...</option>
            {availableSections.map((sec) => (
              <option key={sec.label} value={sec.label}>
                {sec.label}
              </option>
            ))}
          </select>
          {curriculumWarning && (
            <p className="text-[10px] text-amber-600 mt-1 font-semibold flex items-center gap-1">
              <AlertTriangle size={10} /> {curriculumWarning}
            </p>
          )}
        </div>

        {/* Faculty */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Faculty Member
          </label>
          <select
            className={`${inputCls} cursor-pointer`}
            value={displayFacId} // 👈 Uses the new display variable
            onChange={(e) => {
              const val = e.target.value;
              if (val === "OTHER") {
                setForm((f) => ({ ...f, faculty_id: "OTHER" }));
              } else {
                // If they pick a real faculty or TBA, wipe the guest ID
                setForm((f) => ({
                  ...f,
                  faculty_id: val,
                  other_faculty_id: null,
                }));
                setCustomFac("");
              }
            }}
          >
            <option value="TBD">TBA / To Be Decided</option>
            {FACULTY_LIST.map((f) => (
              <option key={f.id} value={f.id}>
                {f.personal.firstName} {f.personal.lastName}
              </option>
            ))}
            {otherFacs?.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.faculty_name} (Custom Add)
              </option>
            ))}
            <option value="OTHER" className="font-bold text-indigo-600">
              ➕ Add Other Faculty...
            </option>
          </select>
          {displayFacId === "OTHER" && (
            <input
              autoFocus
              className={`${inputCls} mt-2 border-indigo-300 bg-indigo-50`}
              placeholder="Type new faculty name..."
              value={customFac}
              onChange={(e) => setCustomFac(e.target.value)}
            />
          )}
        </div>

        {/* Room */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Room
          </label>
          <select
            className={`${inputCls} cursor-pointer`}
            value={displayRoomId} // 👈 Uses the new display variable
            onChange={(e) => {
              const val = e.target.value;
              if (val === "OTHER") {
                setForm((f) => ({ ...f, room_id: "OTHER" }));
              } else {
                // Wipe guest room if they pick a real room
                setForm((f) => ({ ...f, room_id: val, other_room_id: null }));
                setCustomRoom("");
              }
            }}
          >
            <option value="TBD">TBA / To Be Decided</option>
            {ROOM_LIST.map((r) => (
              <option key={r.id} value={r.id}>
                {(r as any).room}
              </option>
            ))}
            {otherRooms?.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.room_name} (Custom Add)
              </option>
            ))}
            <option value="OTHER" className="font-bold text-indigo-600">
              ➕ Add Other Room...
            </option>
          </select>
          {displayRoomId === "OTHER" && (
            <input
              autoFocus
              className={`${inputCls} mt-2 border-indigo-300 bg-indigo-50`}
              placeholder="Type new room name (e.g. Lab 4)..."
              value={customRoom}
              onChange={(e) => setCustomRoom(e.target.value)}
            />
          )}
        </div>

        {/* Day */}
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Day
          </label>
          <select
            className={`${inputCls} cursor-pointer`}
            value={form.day}
            onChange={(e) => set("day", e.target.value)}
          >
            <option value="TBD">TBA / To Be Decided</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden sm:block"></div>

        {/* Start Time */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Start Time
          </label>
          <TimePickerClock
            value={form.start_time}
            onChange={(val: string) => {
              set("start_time", val);
              set("end_time", "");
            }}
            placeholder="Select start time..."
          />
        </div>

        {/* End Time */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            End Time
          </label>
          <TimePickerClock
            value={form.end_time}
            onChange={(val: string) => set("end_time", val)}
            minTime={form.start_time}
            placeholder="Select end time..."
          />
        </div>
      </div>

      {hoursMismatch &&
        selectedSubject &&
        form.start_time !== "TBD" &&
        form.end_time !== "TBD" && (
          <div className="mt-4 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              <strong>{selectedSubject.code}</strong> requires exactly{" "}
              <strong>{expectedHours} hrs</strong>. Current slot is{" "}
              <strong>
                {durationHours} hr{durationHours !== 1 ? "s" : ""}
              </strong>
              .
            </span>
          </div>
        )}

      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            isValid &&
            onSave(
              {
                ...form,
                schedule_id: editing?.schedule_id ?? String(Date.now()),
              } as ScheduleAssignment,
              customFac,
              customRoom,
            )
          }
          disabled={!isValid}
          className={`flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${isValid ? "bg-[#8B0000] hover:bg-[#6B0000]" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          {editing ? "Save Changes" : "Add to Draft Schedule"}
        </button>
      </div>
    </Modal>
  );
}

function DeleteModal({ schedule, onConfirm, onClose }: any) {
  const f = getFaculty(schedule.faculty_id ?? "");
  const s = getSubject(schedule.subject_id);
  return (
    <Modal title="Remove Assignment" onClose={onClose} maxWidth="max-w-sm">
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
          <Trash2 size={22} />
        </div>
        <p className="font-bold text-gray-900 mb-2">Remove this assignment?</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-700">{s?.code}</span>
          <br />
          Assigned to <span className="font-semibold">{getFacultyName(f)}</span>
        </p>
      </div>
      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
        >
          Remove
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT CARD & AI ADVISOR MODAL (Streamlined)
// ─────────────────────────────────────────────────────────────────────────────

function ConflictCard({ c, onApply, onDismiss, onTransfer }: any) {
  const isHard = c.type === "HARD";
  return (
    <div
      className={`rounded-xl border p-4 mb-3 ${isHard ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={16}
          className={`shrink-0 mt-0.5 ${isHard ? "text-red-500" : "text-amber-500"}`}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <ConflictBadge type={c.type} />
            <span
              className={`text-xs font-bold ${isHard ? "text-red-700" : "text-amber-700"}`}
            >
              {c.label}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            {c.message}
          </p>
          {c.transfers?.length > 0 && onTransfer ? (
            <div className="bg-white/80 border border-red-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck size={11} className="text-red-600" />
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">
                  One-Click Transfers
                </span>
              </div>
              {c.transfers.map((t: any) => (
                <div
                  key={t.scheduleId}
                  className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">
                      {t.subjectCode}{" "}
                      <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                        ({t.units}u)
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      → {t.toFacultyName}
                    </p>
                  </div>
                  <button
                    onClick={() => onTransfer(t)}
                    disabled={!t.toFacultyId}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${t.toFacultyId ? "bg-[#8B0000] text-white hover:bg-[#6B0000]" : "bg-gray-200 text-gray-400 cursor-not-allowed"} cursor-pointer`}
                  >
                    <ShieldCheck size={11} /> Transfer
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/70 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={11} className="text-violet-600" />
                <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wide">
                  AI Suggested Fix
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {c.suggestion}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {onApply && (
          <button
            onClick={() => onApply(c)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer ${isHard ? "bg-[#8B0000] hover:bg-[#6B0000]" : "bg-violet-600 hover:bg-violet-700"}`}
          >
            <ShieldCheck size={13} /> Apply Suggestion
          </button>
        )}
        {onDismiss && (
          <button
            onClick={() => onDismiss(c.id)}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

function SetupSectionsModal({ onClose, activeSem, onSave }: any) {
  const programs = ["BSCS", "BSIT", "BSIS"];
  const years = [1, 2, 3, 4];

  // Default all counts to 0
  const [counts, setCounts] = useState<Record<string, Record<number, number>>>(
    () => {
      const init: any = {};
      programs.forEach((p) => {
        init[p] = { 1: 0, 2: 0, 3: 0, 4: 0 };
      });
      return init;
    },
  );

  const [saving, setSaving] = useState(false);

  const updateCount = (prog: string, year: number, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setCounts((prev) => ({ ...prev, [prog]: { ...prev[prog], [year]: num } }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(counts);
    setSaving(false);
  };

  const totalSections = programs.reduce(
    (total, prog) =>
      total + years.reduce((sum, yr) => sum + counts[prog][yr], 0),
    0,
  );

  return (
    <Modal
      title={`Setup Sections (${activeSem.schoolYear})`}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <p className="text-sm text-gray-600 mb-4">
        Define how many sections exist for each program and year level. The
        system will automatically generate the section names (e.g., 1-A, 1-B)
        and link their required subjects.
      </p>

      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Program</th>
              {years.map((y) => (
                <th key={y} className="px-4 py-3 font-semibold text-center">
                  {y}
                  {y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {programs.map((prog) => (
              <tr key={prog}>
                <td className="px-4 py-3 font-bold text-gray-800">{prog}</td>
                {years.map((y) => (
                  <td key={y} className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={counts[prog][y] || ""}
                      onChange={(e) => updateCount(prog, y, e.target.value)}
                      className="w-16 px-2 py-1.5 text-center border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      placeholder="0"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          Total Sections to Generate:{" "}
          <span className="font-bold text-indigo-600 text-lg">
            {totalSections}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || totalSections === 0}
            className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition-colors cursor-pointer ${saving || totalSections === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            {saving ? "Saving..." : "Generate Sections"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ConflictScanModal({
  initialConflicts,
  onApplyFix,
  onApplyTransfers,
  onClose,
  onFinalize,
}: any) {
  const [conflicts, setConflicts] = useState<Conflict[]>(initialConflicts);
  useEffect(() => {
    setConflicts(initialConflicts);
  }, [initialConflicts]);

  const needsAI = conflicts.filter(
    (c) =>
      !c.dismissed &&
      !c.applied &&
      categorizeByFixability(c) === "NEEDS_AI" &&
      c.suggestion,
  );
  const resolved = conflicts.filter((c) => c.dismissed || c.applied);

  // Split the conflicts to fix the button text
  const hardUnresolved = conflicts.filter(
    (c) => c.type === "HARD" && !c.dismissed && !c.applied,
  );
  const overloadConflicts = hardUnresolved.filter((c) =>
    c.id.startsWith("overload-"),
  );

  const canFinalize = hardUnresolved.length === 0;
  const handleApply = (c: Conflict) => {
    onApplyFix(c.fix);
    setConflicts((p) =>
      p.map((x) => (x.id === c.id ? { ...x, applied: true } : x)),
    );
  };
  const handleDismiss = (id: string) =>
    setConflicts((p) =>
      p.map((c) => (c.id === id ? { ...c, dismissed: true } : c)),
    );
  const handleTransfer = (conflictId: string, t: ConflictTransfer) => {
    onApplyTransfers([t]);
    setConflicts((p) =>
      p.map((c) => {
        if (c.id !== conflictId) return c;
        const remaining = c.transfers.filter(
          (x) => x.scheduleId !== t.scheduleId,
        );
        return { ...c, transfers: remaining, applied: remaining.length === 0 };
      }),
    );
  };

  return (
    <Modal
      title="AI Faculty Load Advisor"
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className={`rounded-xl border p-4 flex flex-col items-center justify-center ${needsAI.length ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-200"}`}
        >
          <div
            className={`text-3xl font-black ${needsAI.length ? "text-violet-600" : "text-gray-400"}`}
          >
            {needsAI.length}
          </div>
          <div
            className={`text-xs font-bold mt-1 ${needsAI.length ? "text-violet-600" : "text-gray-400"}`}
          >
            Pending Reassignments
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-gray-400">
            {resolved.length}
          </div>
          <div className="text-xs font-bold text-gray-400 mt-1">Resolved</div>
        </div>
      </div>

      {needsAI.length > 0 && (
        <div className="mb-6 p-4 bg-violet-50 border-2 border-violet-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-violet-600" />
            <p className="text-sm font-bold text-violet-700">
              AI Reassignment Suggestions ({needsAI.length})
            </p>
            <p className="ml-auto text-xs text-violet-600">
              Resolve faculty overloads
            </p>
          </div>
          <div className="space-y-3">
            {needsAI.map((c) => (
              <ConflictCard
                key={c.id}
                c={c}
                onApply={c.fix ? handleApply : null}
                onDismiss={c.type === "SOFT" ? handleDismiss : null}
                onTransfer={
                  c.transfers?.length
                    ? (t: any) => handleTransfer(c.id, t)
                    : null
                }
              />
            ))}
          </div>
        </div>
      )}

      {needsAI.length === 0 && (
        <div className="flex flex-col items-center py-10 gap-3 mb-6 bg-green-50 border-2 border-green-200 rounded-xl">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 size={32} />
          </div>
          <div className="text-center">
            <p className="font-bold text-green-900 text-lg">
              No Overloads Detected!
            </p>
            <p className="text-sm text-green-700 mt-1">
              Faculty workloads are balanced. <br />
              (Use 'Auto-Fix' for any remaining room or time overlaps).
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <button
          onClick={() => canFinalize && onFinalize()}
          disabled={!canFinalize}
          className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${canFinalize ? "bg-[#8B0000] text-white hover:bg-[#6B0000]" : "bg-gray-100 text-gray-500 cursor-not-allowed"}`}
        >
          <ShieldCheck size={16} />
          {canFinalize
            ? "Finalize Schedule"
            : overloadConflicts.length > 0
              ? `Resolve ${overloadConflicts.length} faculty overload(s) to continue`
              : `Run 'Auto-Fix Rooms' on the dashboard to resolve other conflicts`}
        </button>
      </div>
    </Modal>
  );
}

function AutoFixResultsModal({
  data,
  onClose,
}: {
  data: {
    changes: Array<{
      subject: string;
      section: string;
      oldTime: string;
      oldRoom: string;
      newTime: string;
      newRoom: string;
    }>;
    failed: ScheduleAssignment[];
  };
  onClose: () => void;
}) {
  return (
    <Modal title="Auto-Fix Results" onClose={onClose} maxWidth="max-w-2xl">
      {/* Success Summary */}
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
        <CheckCircle2 size={24} className="text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-green-900">
            Successfully resolved and saved {data.changes.length} conflict(s).
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            These changes have been permanently applied to the database.
          </p>
        </div>
      </div>

      {/* Changes Log */}
      {data.changes.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Resolution Log
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {data.changes.map((c, i) => (
              <div
                key={i}
                className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm"
              >
                <p className="font-bold text-gray-800 mb-1">
                  {c.subject}{" "}
                  <span className="text-gray-400 font-normal">
                    ({c.section})
                  </span>
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="line-through text-red-400">
                    {c.oldTime} in {c.oldRoom}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-semibold text-green-600">
                    {c.newTime} in {c.newRoom}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failures Log */}
      {data.failed.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <p className="text-sm font-bold text-red-900">
              Could not resolve {data.failed.length} assignment(s)
            </p>
          </div>
          <p className="text-xs text-red-700 mb-3">
            These classes literally ran out of physical space or faculty hours.
            You must fix these manually by changing the professor or splitting
            the class. You can access this list anytime from the main dashboard.
          </p>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {data.failed.map((s, i) => {
              const sub = getSubject(s.subject_id);
              const fac = getFaculty(s.faculty_id ?? "");
              return (
                <div
                  key={i}
                  className="bg-white border border-red-100 rounded-lg p-2 flex justify-between text-xs"
                >
                  <span className="font-bold text-red-800">
                    {sub?.code ?? s.subject_id}{" "}
                    <span className="text-red-400 font-normal">
                      ({s.section})
                    </span>
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {getFacultyName(fac)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100 text-right">
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST VIEW AND TIMETABLE VIEW (Minified)
// ─────────────────────────────────────────────────────────────────────────────

function ListView({ data, otherFacs = [], otherRooms = [], onEdit, onDelete }: any) {
  // 12-hour time formatter used in previous updates
  const formatTime12h = (timeStr: string) => {
    if (!timeStr || timeStr === "TBD") return "TBA";
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden font-lexend shadow-sm">
      {/* ── Table Header: Matched to MySchedule styles ── */}
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

      {/* ── List Rows ── */}
      <div className="divide-y divide-gray-50">
        {data.map((s: any) => {
          const f = getFaculty(s.faculty_id);
          const sub = getSubject(s.subject_id);
          const r = getRoom(s.room_id ?? "");
          const isGuest = !!s.other_faculty_id;
          const isUnassigned = s.faculty_id === "TBD" && !isGuest;
          
          const guestFacName = otherFacs.find((x: any) => x.id === s.other_faculty_id)?.faculty_name || "Guest Faculty";
          const guestRoomName = otherRooms.find((x: any) => x.id === s.other_room_id)?.room_name || "Guest Room";

          return (
            <div key={s.schedule_id} className="group hover:bg-gray-50/50 transition-colors relative">
              {/* Hover highlight line */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8B0000] opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="lg:grid lg:grid-cols-[0.9fr_0.6fr_0.6fr_1.6fr_0.8fr_0.8fr_1.3fr_0.8fr] flex flex-col gap-4 px-6 py-5 items-start lg:items-center">
                
                {/* 1. Subject Code: text-sm font-bold text-[#8B0000] */}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#8B0000] uppercase tracking-tight">{sub?.code}</p>
                </div>

                {/* 2. Section: text-sm font-semibold text-gray-700 */}
                <div className="min-w-0">
                   <p className="text-sm font-semibold text-gray-700 uppercase">{s.section}</p>
                </div>

                {/* 3. Day: text-sm font-semibold text-gray-700 */}
                <div className="text-sm font-semibold text-gray-700">
                  {s.day === "TBD" ? <span className="text-amber-500 italic">TBA</span> : s.day}
                </div>

                {/* 4. Time: text-sm font-semibold text-gray-700 */}
                <div className="text-sm font-semibold text-gray-700 uppercase whitespace-nowrap">
                  {s.start_time === "TBD" ? 
                    <span className="text-amber-500 italic">TBA</span> : 
                    `${formatTime12h(s.start_time)} - ${formatTime12h(s.end_time)}`
                  }
                </div>

                {/* 5. Room: text-sm text-gray-700 */}
                <div className="text-sm text-gray-700 truncate">
                  {s.other_room_id ? guestRoomName : (r?.room ?? <span className="text-amber-500 italic">TBA</span>)}
                </div>

                {/* 6. Status Badge: Kept for logic, text inside matched */}
                <div className="lg:text-center w-full lg:w-auto">
                  <StatusBadge status={s.status} />
                </div>

                {/* 7. Faculty Member: text-sm font-semibold text-gray-700 */}
                <div className="min-w-0 w-full lg:w-auto">
                  {isUnassigned ? (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 w-fit">
                      <Users size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Needs Faculty</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-gray-700 truncate">
                      {isGuest ? guestFacName : getFacultyName(f)}
                    </p>
                  )}
                </div>

                {/* 8. Actions */}
                <div className="flex items-center justify-end gap-1 w-full lg:w-auto opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(s)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                    <Pencil size={15}/>
                  </button>
                  <button onClick={() => onDelete(s)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={15}/>
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
const SNAP_MINS = 30;
const PIXELS_PER_MIN = SLOT_H / 60;

function TimetableView({ data, onEdit, onDelete }: any) {
  const [ghost, setGhost] = useState<{
    day: string;
    start: string;
    end: string;
  } | null>(null);
  const [draggedItem, setDraggedItem] = useState<ScheduleAssignment | null>(
    null,
  );
  const byDay = useMemo(() => {
    const m: Record<string, ScheduleAssignment[]> = {};
    DAYS.forEach((d) => {
      m[d] = [];
    });
    data.forEach((s: any) => {
      if (m[s.day]) m[s.day].push(s);
    });
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
    const duration =
      toMins(draggedItem.end_time) - toMins(draggedItem.start_time);
    const toHHMM = (m: number) =>
      `${Math.floor(m / 60)
        .toString()
        .padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
    const newStart = toHHMM(startTotalMins);
    const newEnd = toHHMM(startTotalMins + duration);
    if (ghost?.day !== day || ghost?.start !== newStart) {
      setGhost({ day, start: newStart, end: newEnd });
    }
  };
  const handleDrop = () => {
    if (!ghost || !draggedItem) return;
    onEdit({
      ...draggedItem,
      day: ghost.day,
      start_time: ghost.start,
      end_time: ghost.end,
    });
    setGhost(null);
    setDraggedItem(null);
  };
  const height = (s: string, e: string) =>
    Math.max(((toMins(e) - toMins(s)) / 60) * SLOT_H - 4, 28);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden w-full">
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
      <div
        className="grid"
        style={{
          gridTemplateColumns: `52px repeat(${DAYS.length},1fr)`,
          minWidth: 0,
        }}
      >
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
        {DAYS.map((day) => (
          <div
            key={day}
            className="relative border-r border-gray-100 overflow-hidden"
            onDragOver={(e) => handleDragOver(e, day)}
            onDrop={handleDrop}
            onDragLeave={() => setGhost(null)}
          >
            {TIME_LABELS.map((t, i) => (
              <div
                key={t}
                style={{ height: SLOT_H }}
                className={`border-b ${i % 2 === 0 ? "border-gray-100" : "border-dashed border-gray-50"} ${i % 2 !== 0 ? "bg-gray-50/40" : ""}`}
              />
            ))}
            {ghost && ghost.day === day && (
              <div
                className="absolute left-1 right-1 rounded-lg border-2 border-dashed border-[#8B0000] bg-[#8B0000]/5 z-0 pointer-events-none"
                style={{
                  top:
                    (toMins(ghost.start) - START_H * 60) * PIXELS_PER_MIN + 2,
                  height:
                    (toMins(ghost.end) - toMins(ghost.start)) * PIXELS_PER_MIN -
                    4,
                }}
              />
            )}
            {byDay[day].map((s: any) => {
              const f = getFaculty(s.faculty_id),
                sub = getSubject(s.subject_id),
                r = getRoom(s.room_id);
              const blockH = height(s.start_time, s.end_time);
              return (
                <div
                  key={s.schedule_id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, s)}
                  className={`absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden cursor-pointer group border-l-2 border-l-[#8B0000] bg-[#FFF3F3] hover:bg-[#FFE8E8] transition-colors ${draggedItem?.schedule_id === s.schedule_id ? "opacity-20" : ""}`}
                  style={{
                    top:
                      (toMins(s.start_time) - START_H * 60) * PIXELS_PER_MIN +
                      2,
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(s);
                        }}
                        className="flex-1 bg-[#8B0000] text-white text-[9px] font-bold rounded py-0.5 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(s);
                        }}
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
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-4">
        {FACULTY_LIST.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-1.5 text-xs text-gray-600"
          >
            <div className={`w-2.5 h-2.5 rounded-sm ${getAvatarColor(f)}`} />
            {getFacultyName(f)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR PANELS
// ─────────────────────────────────────────────────────────────────────────────

function LoadMonitorPanel({ sched }: { sched: ScheduleAssignment[] }) {
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
            pct >= 100
              ? "bg-red-500"
              : pct >= 85
                ? "bg-amber-400"
                : "bg-green-500";
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
        <p className="font-bold text-primary mb-1">Unit/Hour Rule</p>1 unit ={" "}
        {HOURS_PER_UNIT} hr of class time
        <br />
        Exceeding this flags a{" "}
        <span className="font-bold text-red-600">Hard Conflict</span>
      </div>
    </div>
  );
}

function ScheduleStatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all hover:border-burgundy cursor-pointer">
      <div className="flex items-center gap-4">
        {/* Icon: Matches DashboardCard circle style */}
        <div className="bg-burgundy rounded-full p-4 flex-shrink-0 flex items-center justify-center text-white">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
            {label}
          </h3>

          {/* Value: Increased to 4xl to match Dashboard */}
          <p className="text-4xl font-bold text-burgundy mb-2">
            {value}
          </p>

          {/* Subtext: Matches Dashboard description style */}
          {sub && (
            <p className="text-xs text-slate-500">
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ManageSchedule() {
  const [schedules, setSchedules] = useState<ScheduleAssignment[]>([]);
  const [view, setView] = useState<"list" | "timetable">("list");
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState("All");
  const [filterFac, setFilterFac] = useState("All");
  const [filterProgram, setFilterProgram] = useState("All");
  const [filterRoom, setFilterRoom] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("subject_asc");
  const [modal, setModal] = useState<
    | "add"
    | "edit"
    | "delete"
    | "scan"
    | "reasoning"
    | "fixResults"
    | "setup"
    | "audit"
    | null
  >(null);
  const [selected, setSelected] = useState<ScheduleAssignment | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [scanning, setScanning] = useState(false);
  const [_scanned, setScanned] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const unresolvedItems = useMemo(() => {
    return schedules.filter((s) => {
      if (isExternalSubject(s.subject_id)) return false; // Ignore GE/PE/NSTP
      return (
        s.day === "TBD" ||
        s.start_time === "TBD" ||
        s.room_id === "TBD" ||
        !s.day
      );
    });
  }, [schedules]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeSem, setActiveSem] = useState<{
    schoolYear: string;
    sem: 1 | 2;
  }>({ schoolYear: "2024-2025", sem: 1 });
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [otherFacs, setOtherFacs] = useState<any[]>([]);
  const [otherRooms, setOtherRooms] = useState<any[]>([]);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [cachedLoadAdvice, setCachedLoadAdvice] = useState<any[] | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);
  // Checks if schedules currently exist in the fetched state (disables Generate button)
  const hasExistingSchedules = schedules.length > 0;
  const ITEMS_PER_PAGE = 10;
  const formattedSY = parseInt(
    (activeSem.schoolYear.split("-")[0]?.slice(-2) || "") +
      (activeSem.schoolYear.split("-")[1]?.slice(-2) || ""),
  );

  // Check if any section exists for the currently selected Sem & SY
  const hasExistingSections = curriculums.some((prog) =>
    prog.sections.some((sec: any) => {
      // We only care if the School Year matches! Semester is irrelevant for sections.
      return Number(sec.school_year) === Number(formattedSY);
    }),
  );

  useEffect(() => {
    setCurrentPage(1);
    const loadData = async () => {
      try {
        const params = { schoolYear: activeSem.schoolYear, sem: activeSem.sem };
        const [
          facRes,
          subRes,
          roomRes,
          schedRes,
          currRes,
          otherFacRes,
          otherRoomRes,
        ] = await Promise.all([
          api.get("/manage-schedule/faculty", { params }),
          api.get("/manage-schedule/subjects", { params }),
          api.get("/manage-schedule/rooms", { params }),
          api.get("/manage-schedule/schedules", { params }),
          api.get("/manage-schedule/curriculums"),
          api.get("/manage-schedule/other-faculty").catch(() => ({ data: [] })),
          api.get("/manage-schedule/other-rooms").catch(() => ({ data: [] })),
        ]);

        const unwrapArray = (response: any): any[] => {
          if (Array.isArray(response)) return response;
          if (response?.data && Array.isArray(response.data))
            return response.data;
          return [];
        };

        const facData = unwrapArray(facRes.data ?? facRes);
        const subData = unwrapArray(subRes.data ?? subRes);
        const roomData = unwrapArray(roomRes.data ?? roomRes);
        const schedData = unwrapArray(schedRes.data ?? schedRes);
        const currData = unwrapArray(currRes.data ?? currRes);
        setOtherFacs(unwrapArray(otherFacRes?.data ?? []));
        setOtherRooms(unwrapArray(otherRoomRes?.data ?? []));

        FACULTY_LIST.length = 0;
        FACULTY_LIST.push(
          ...facData.map((f: any) => {
            const personal = f.personal
              ? typeof f.personal === "string"
                ? JSON.parse(f.personal)
                : f.personal
              : null;
            const prefs = f.preferences
              ? typeof f.preferences === "string"
                ? JSON.parse(f.preferences)
                : f.preferences
              : {};
            return {
              id: f.id || f.faculty_id,
              personal: {
                firstName: personal?.firstName ?? f.first_name,
                lastName: personal?.lastName ?? f.last_name,
                employmentType:
                  personal?.employmentType ?? f.employment_type ?? "Full-time",
                status: personal?.status ?? f.status ?? "Active",
              },
              preferences: prefs,
              photo_url: f.photo_url,
            };
          }),
        );

        SUBJECT_LIST.length = 0;
        SUBJECT_LIST.push(
          ...subData.map((s: any) => ({
            id: (s.subject_code ?? s.code ?? "").trim(),
            code: (s.subject_code ?? s.code ?? "").trim(),
            name: s.subject_name ?? s.name,
            units: s.units ?? 0,
            facilityType: s.facility_type ?? s.facilityType ?? "lecture",
            assignmentMode: s.assignment_mode ?? s.assignmentMode ?? "auto",
            canSplit: s.can_split ?? s.canSplit ?? false,
            splitPattern: s.split_pattern ?? s.splitPattern ?? null,
            semester: s.semester ?? 1,
          })),
        );

        ROOM_LIST.length = 0;
        ROOM_LIST.push(
          ...roomData.map((r: any) => ({
            id: r.id,
            room: r.room,
            type: r.type ?? "lecture",
            capacity: r.capacity ?? 40,
          })),
        );

        setCurriculums(
          currData.map((c: any) => ({
            program: c.program || c.label,
            termSubjects: c.curriculum_term_subjects || [],
            sections: (c.curriculum_sections || []).map((sec: any) => ({
              label: `${c.program || c.label} ${sec.year_level}-${sec.section}`,
              yearLevel: sec.year_level,
              semester: sec.semester,
              section: sec.section,
              school_year: sec.school_year,
            })),
          })),
        );

        setSchedules(
          schedData.map((s: any) => {
            return {
              schedule_id: s.schedule_id ?? s.id,
              faculty_id: s.faculty_id || "TBD",
              other_faculty_id: s.other_faculty_id || null, // 👈 CRITICAL: Stop dropping this!
              subject_id: s.subject_id,
              room_id: s.room_id || "TBD",
              other_room_id: s.other_room_id || null, // 👈 CRITICAL: Stop dropping this!
              day: s.day || "TBD",
              start_time: s.start_time || "TBD",
              end_time: s.end_time || "TBD",
              section: s.section,
              status: s.status ?? "draft",
              session_group_id: s.session_group_id,
              session_hours: s.session_hours,
            };
          }),
        );

        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to load database records:", error);
      }
    };
    loadData();
  }, [
    search,
    filterDay,
    filterFac,
    filterProgram,
    filterRoom,
    filterStatus,
    activeSem.schoolYear,
    activeSem.sem,
  ]);

  const drafts = schedules.filter((s) => s.status === "draft").length;
  const finalized = schedules.filter((s) => s.status === "finalized").length;
  const published = schedules.filter((s) => s.status === "published").length;

  const filtered = useMemo(() => {
    let result = schedules.filter((s) => {
      const f = getFaculty(s.faculty_id ?? "");
      const sub = getSubject(s.subject_id);
      const q = search.toLowerCase();

      const safeSection = s.section ? String(s.section).trim() : "";
      const sectionProgram = safeSection.split(" ")[0]?.toUpperCase() || "";
      const programMatch =
        filterProgram === "All" ||
        sectionProgram === filterProgram.toUpperCase();
      const roomMatch =
        filterRoom === "All" || String(s.room_id) === String(filterRoom);

      const matchesSearch =
        !search ||
        (f && getFacultyName(f).toLowerCase().includes(q)) ||
        (sub && sub.name.toLowerCase().includes(q)) ||
        (sub && sub.code.toLowerCase().includes(q)) ||
        safeSection.toLowerCase().includes(q);

      return (
        matchesSearch &&
        (filterDay === "All" || s.day === filterDay) &&
        (filterFac === "All" || String(s.faculty_id) === String(filterFac)) &&
        programMatch &&
        roomMatch &&
        (filterStatus === "All" || s.status === filterStatus)
      );
    });

    // --- NEW SORTING LOGIC ---
    result.sort((a, b) => {
      const subA = getSubject(a.subject_id)?.code || "";
      const subB = getSubject(b.subject_id)?.code || "";

      if (sortOrder === "subject_asc") {
        return subA.localeCompare(subB);
      } else if (sortOrder === "subject_desc") {
        return subB.localeCompare(subA);
      }
      return 0;
    });

    return result;
  }, [
    schedules,
    search,
    filterDay,
    filterFac,
    filterProgram,
    filterRoom,
    filterStatus,
    sortOrder,
    isDataLoaded,
  ]);

  const openEdit = (s: ScheduleAssignment) => {
    setSelected(s);
    setModal("edit");
  };
  const openDelete = (s: ScheduleAssignment) => {
    setSelected(s);
    setModal("delete");
  };
  const closeModal = () => {
    setModal(null);
    setSelected(null);
  };

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };
  const handleSave = async (
    entry: any,
    customFacName?: string,
    customRoomName?: string,
  ) => {
    try {
      // 1. Initialize logic variables
      let finalFacId: string | null = entry.faculty_id;
      let finalOtherFacId: string | null = entry.other_faculty_id;
      let finalRoomId: string | null = entry.room_id;
      let finalOtherRoomId: string | null = entry.other_room_id;

      const facultySafeRegex = /^[a-zA-Z\s.,'-]{2,50}$/;
      const roomSafeRegex = /^[a-zA-Z0-9\s-]{2,30}$/;

      // 2. SECURITY & VALIDATION
      if (finalFacId === "OTHER" && customFacName) {
        if (!facultySafeRegex.test(customFacName.trim())) {
          alert("⚠️ Invalid Faculty Name.");
          return;
        }
      }
      if (finalRoomId === "OTHER" && customRoomName) {
        if (!roomSafeRegex.test(customRoomName.trim())) {
          alert("⚠️ Invalid Room Name.");
          return;
        }
      }

      // 3. HANDLE GUEST FACULTY
      if (finalFacId === "OTHER" && customFacName) {
        const normalizedName = customFacName
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const fRes = await api.post("/manage-schedule/other-faculty", {
          name: normalizedName,
        });

        // Bulletproof fallback to catch the ID no matter what the backend calls it
        finalOtherFacId = fRes.data.id || fRes.data.other_faculty_id || null;
        finalFacId = null;
      } else if (finalFacId === "TBD") {
        finalFacId = null;
      }

      // 4. HANDLE GUEST ROOM
      if (finalRoomId === "OTHER" && customRoomName) {
        const normalizedRoom = customRoomName.trim().toUpperCase();
        const rRes = await api.post("/manage-schedule/other-rooms", {
          name: normalizedRoom,
        });

        finalOtherRoomId = rRes.data.id || rRes.data.other_room_id || null;
        finalRoomId = null;
      } else if (finalRoomId === "TBD") {
        finalRoomId = null;
      }

      if (
        finalFacId &&
        otherFacs.some(
          (f: any) => f.id === finalFacId || f.other_faculty_id === finalFacId,
        )
      ) {
        finalOtherFacId = finalFacId;
        finalFacId = null;
      }

      if (
        finalRoomId &&
        otherRooms.some(
          (r: any) => r.id === finalRoomId || r.other_room_id === finalRoomId,
        )
      ) {
        finalOtherRoomId = finalRoomId;
        finalRoomId = null;
      }
      // 5. BUILD PAYLOAD (Matches your updated DB Schema)
      const payload = {
        faculty_id: finalFacId === "TBD" ? null : finalFacId,
        other_faculty_id: finalOtherFacId || null, // NEW COLUMN
        room_id: finalRoomId === "TBD" ? null : finalRoomId,
        other_room_id: finalOtherRoomId || null, // NEW COLUMN
        subject_id: entry.subject_id,
        day: !entry.day || entry.day === "TBD" ? null : entry.day,
        start_time:
          !entry.start_time || entry.start_time === "TBD"
            ? null
            : entry.start_time,
        end_time:
          !entry.end_time || entry.end_time === "TBD" ? null : entry.end_time,
        section: entry.section,
        status: entry.status ?? "draft",
        session_group_id: entry.session_group_id,
        session_hours: entry.session_hours,
        school_year: activeSem.schoolYear,
        semester: activeSem.sem,
      };

      // 6. EXECUTE SAVE
      if (modal === "edit") {
        await api.patch(
          `/manage-schedule/schedules/${entry.schedule_id}`,
          payload,
        );
      } else {
        const res = await api.post("/manage-schedule/schedules", payload);
        entry.schedule_id = res.data.id || res.data.schedule_id;
      }

      // Update local state with the processed IDs
      setSchedules((p) =>
        p.map((s) =>
          s.schedule_id === entry.schedule_id ? { ...entry, ...payload } : s,
        ),
      );
      closeModal();
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save schedule.");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/manage-schedule/schedules/${selected.schedule_id}`);
      setSchedules((p) =>
        p.filter((s) => s.schedule_id !== selected.schedule_id),
      );
      setScanned(false);
      closeModal();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete schedule from database.");
    }
  };

  const handleApplyFix = (fix: any) => {
    if (!fix) return;
    setSchedules((p) =>
      p.map((s) =>
        s.schedule_id === fix.scheduleId ? { ...s, [fix.field]: fix.value } : s,
      ),
    );
    setConflicts((p) =>
      p.map((c) =>
        c.fix?.scheduleId === fix.scheduleId ? { ...c, applied: true } : c,
      ),
    );
    setScanned(false);
  };

  const handleApplyTransfers = async (transfers: ConflictTransfer[]) => {
    if (!transfers.length) return;
    const transferredIds = new Set(transfers.map((t) => t.scheduleId));
    setSchedules((prev) =>
      prev.map((s) => {
        const t = transfers.find((tr) => tr.scheduleId === s.schedule_id);
        return t ? { ...s, faculty_id: t.toFacultyId } : s;
      }),
    );
    setConflicts((prev) =>
      prev.map((c) => {
        const remaining = c.transfers.filter(
          (t) => !transferredIds.has(t.scheduleId),
        );
        return remaining.length === c.transfers.length
          ? c
          : { ...c, transfers: remaining, applied: remaining.length === 0 };
      }),
    );
    try {
      await Promise.all(
        transfers.map((t) =>
          api.patch(`/manage-schedule/schedules/${t.scheduleId}`, {
            faculty_id: t.toFacultyId,
          }),
        ),
      );
    } catch (err) {
      console.error("[DB Error] Failed to save transfers:", err);
    }
    setScanned(false);
  };

  const handleDeterministicFix = async () => {
    console.log("[Auto-Fix] Starting deterministic resolution...");
    const clonedSchedules = JSON.parse(JSON.stringify(schedules));

    // 1. Run the engine (which now correctly returns all 103 items)
    const { fixedSchedules } =
      resolveConflictsDeterministically(clonedSchedules);

    const changes: Array<{
      subject: string;
      section: string;
      oldTime: string;
      oldRoom: string;
      newTime: string;
      newRoom: string;
    }> = [];
    const dbUpdates: Promise<any>[] = [];

    // 2. Map the changes
    fixedSchedules.forEach((newSched: ScheduleAssignment) => {
      const oldSched = schedules.find(
        (s) => s.schedule_id === newSched.schedule_id,
      );
      if (oldSched) {
        const changedTime =
          oldSched.start_time !== newSched.start_time ||
          oldSched.day !== newSched.day;
        const changedRoom = oldSched.room_id !== newSched.room_id;

        if (changedTime || changedRoom) {
          const sub = getSubject(newSched.subject_id);
          const oldRoomObj = getRoom(oldSched.room_id ?? "");
          const newRoomObj = getRoom(newSched.room_id ?? "");

          changes.push({
            subject: sub?.code ?? newSched.subject_id,
            section: newSched.section,
            oldTime:
              oldSched.start_time === "TBD"
                ? "Unscheduled"
                : `${oldSched.day} ${oldSched.start_time}`,
            oldRoom: oldRoomObj?.room ?? "Unassigned",
            newTime: `${newSched.day} ${newSched.start_time}`,
            newRoom: newRoomObj?.room ?? newSched.room_id,
          });

          // Queue the DB patch
          dbUpdates.push(
            api
              .patch(`/manage-schedule/schedules/${newSched.schedule_id}`, {
                day: newSched.day,
                start_time: newSched.start_time,
                end_time: newSched.end_time,
                room_id: newSched.room_id,
              })
              .catch((err) =>
                console.error(`[DB Error] Failed to auto-fix`, err),
              ),
          );
        }
      }
    });

    // 3. Save to database
    if (dbUpdates.length > 0) {
      console.log(
        `[DB Saving] Executing ${dbUpdates.length} PATCH requests...`,
      );
      try {
        await Promise.all(dbUpdates);
      } catch (e) {
        console.error("DB saves failed");
      }
    }

    // 4. Update the UI state with all 103 items
    setSchedules(fixedSchedules);

    // Calculate the failed items just to pass into the Results Modal
    const failedSchedules = fixedSchedules.filter(
      (s: ScheduleAssignment) =>
        s.day === "TBD" || s.start_time === "TBD" || s.room_id === "TBD",
    );

    setFixResults({ changes, failed: failedSchedules });
    setModal("fixResults");
    runScan(true, fixedSchedules);
  };

  const handleFinalize = async () => {
    const toFinalize = schedules.filter((s) => s.status === "draft");
    if (toFinalize.length === 0) {
      closeModal();
      return;
    }
    setSchedules((p) =>
      p.map((s) =>
        s.status === "draft"
          ? { ...s, status: "finalized" as ScheduleStatus }
          : s,
      ),
    );
    try {
      await Promise.all(
        toFinalize.map((entry) =>
          api.patch(`/manage-schedule/schedules/${entry.schedule_id}`, {
            status: "finalized",
          }),
        ),
      );
    } catch (err) {
      console.error("[DeptFlow] Failed to persist finalize:", err);
    }
    setScanned(false);
    closeModal();
  };

  const handlePublish = async () => {
    const toPublish = schedules.filter((s) => s.status === "finalized");
    if (toPublish.length === 0) {
      alert("No finalized schedules to publish.");
      return;
    }
    const ok = window.confirm(
      `Publish ${toPublish.length} finalized schedule entry(ies)?`,
    );
    if (!ok) return;
    setSchedules((p) =>
      p.map((s) =>
        s.status === "finalized"
          ? { ...s, status: "published" as ScheduleStatus }
          : s,
      ),
    );
    try {
      await Promise.all(
        toPublish.map((entry) =>
          api.patch(`/manage-schedule/schedules/${entry.schedule_id}`, {
            status: "published",
          }),
        ),
      );
    } catch (err) {
      setSchedules((p) =>
        p.map((s) =>
          s.status === "published" &&
          toPublish.find((x) => x.schedule_id === s.schedule_id)
            ? { ...s, status: "finalized" as ScheduleStatus }
            : s,
        ),
      );
      alert("Failed to publish schedules.");
    }
  };

  const handleRunAiAudit = async () => {
    setIsAuditing(true);
    try {
      // 1. Run the math engine first so we have facts to feed the AI
      const localConflicts = runConflictScan(schedules);
      const context = buildGeminiContext(schedules, localConflicts);

      // 2. Fetch the report and cache it
      const report = await validateFullScheduleAdherence(context);
      setAiReport(report);
      setModal("audit"); // Open the modal specifically
    } catch (err) {
      alert("AI Audit failed.");
    } finally {
      setIsAuditing(false);
    }
  };

  const [generating, setGenerating] = useState(false);
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateSchedule({ sem: activeSem.sem });
      setSchedules(result.schedule);
      const savedEntries = await Promise.all(
        result.schedule.map(async (entry) => {
          const payload = {
            schedule_id: entry.schedule_id,
            faculty_id: entry.faculty_id === "TBD" ? null : entry.faculty_id,
            subject_id: entry.subject_id,
            room_id: entry.room_id === "TBD" ? null : entry.room_id,
            day: entry.day === "TBD" ? null : entry.day,
            start_time: entry.start_time === "TBD" ? null : entry.start_time,
            end_time: entry.end_time === "TBD" ? null : entry.end_time,
            section: entry.section,
            status: "draft",
            session_group_id: entry.session_group_id,
            session_hours: entry.session_hours,
            school_year: activeSem.schoolYear,
            semester: activeSem.sem,
          };
          const res = await api.post("/manage-schedule/schedules", payload);
          const realId =
            res.data?.schedule_id ?? res.data?.data?.id ?? entry.schedule_id;
          return { ...entry, schedule_id: realId };
        }),
      );
      setSchedules(savedEntries.filter(Boolean));
      setScanned(false);
      setModal("reasoning");
    } catch (err) {
      console.error("Generation failed:", err);
      alert("Generation failed. Check console.");
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenLoadAdvisor = async () => {
    // 1. Instantly open the modal so the user feels immediate feedback
    setIsAdvisorModalOpen(true);

    // 2. If we ALREADY have advice, stop here. Do not call Gemini again.
    if (cachedLoadAdvice !== null) return;

    // 3. If the buffer is empty, call Gemini to get new advice
    await generateNewLoadAdvice();
  };

  const generateNewLoadAdvice = async () => {
    setIsAdvisorLoading(true);
    try {
      const facultyRes = await api.get("/manage-schedule/faculty");
      const freshFaculty = facultyRes.data || [];

      // 1. Scan current schedules to build context
      const localConflicts = runConflictScan(schedules);

      let context = buildGeminiContext(schedules, localConflicts);

      context = {
        ...context,
        faculty: context.faculty.map((f) => {
          const fullFacultyRecord = freshFaculty.find(
            (fac: any) => fac.faculty_id === f.id,
          );
          const specs =
            fullFacultyRecord?.faculty_preferences?.subject_specializations ||
            [];
          return {
            ...f,
            specializations: specs,
          };
        }),
      };

      const validationContext: ValidationContext = {
        ...context,
        allSchedules: schedules,
        allFaculty: freshFaculty.map((fac: any) => ({
          id: fac.faculty_id,
          personal: {
            first_name: fac.first_name, // ✅ snake_case, NOT firstName
            last_name: fac.last_name, // ✅ snake_case, NOT lastName
            employmentType: fac.employment_type,
          },
        })),
        allSubjects: SUBJECT_LIST,
      };

      const geminiSuggestions = await enrichConflictsWithGemini(
        context,
        validationContext,
      );

      // 3. Filter only the load advice
      const adviceOnly = geminiSuggestions.filter((s: any) =>
        s.conflictId.startsWith("load-advice-"),
      );

      setCachedLoadAdvice(adviceOnly);
    } catch (error) {
      console.error("Failed to fetch load advice", error);
      setCachedLoadAdvice([]);
    } finally {
      setIsAdvisorLoading(false);
    }
  };

  const handleSetupSections = async (counts: any) => {
    try {
      await api.post("/manage-schedule/curriculums/setup-sections", {
        schoolYear: activeSem.schoolYear,
        semester: activeSem.sem,
        counts,
      });
      alert("Sections successfully generated!");
      setModal(null);
      window.location.reload(); // Refresh to load the new curriculums state
    } catch (error) {
      console.error("Failed to setup sections:", error);
      alert("Failed to save sections.");
    }
  };

  const runScan = async (silent = false, schedulesToScan = schedules) => {
    setScanning(true);
    setScanned(false);

    const localConflicts = runConflictScan(schedulesToScan);
    setConflicts(localConflicts);
    setScanning(false);
    setScanned(true);

    // Only open the modal if we are NOT running silently
    if (silent) {
      console.log(
        "[DeptFlow] Local scan complete. Skipping AI Advisor (Silent Mode).",
      );
      return;
    }
    setModal("scan");

    if (localConflicts.length === 0) return;

    try {
      const context = buildGeminiContext(schedulesToScan, localConflicts);
      const validationContext: ValidationContext = {
        ...context,
        allSchedules: schedulesToScan,
        allFaculty: FACULTY_LIST,
        allSubjects: SUBJECT_LIST,
      };
      const geminiSuggestions = await enrichConflictsWithGemini(
        context,
        validationContext,
      );
      if (geminiSuggestions.length > 0) {
        setConflicts((prev) =>
          prev
            .map((conflict) => {
              const match = geminiSuggestions.find(
                (g) => g.conflictId === conflict.id,
              );
              return match
                ? {
                    ...conflict,
                    suggestion: match.suggestion,
                    ...(match.summaryNote && {
                      message: `${conflict.message} — ${match.summaryNote}`,
                    }),
                  }
                : conflict;
            })
            .filter(
              (c) =>
                !(categorizeByFixability(c) === "NEEDS_AI" && !c.suggestion),
            ),
        );
      }
    } catch (err) {
      console.error("Gemini Advisor failed:", err);
    }
  };

  const [fixResults, setFixResults] = useState<{
    changes: Array<{
      subject: string;
      section: string;
      oldTime: string;
      oldRoom: string;
      newTime: string;
      newRoom: string;
    }>;
    failed: ScheduleAssignment[];
  } | null>(null);

  return (
    <AdminLayout>
      <div className="p-0 space-y-6 font-lexend">
        {/* ── Page Header (Streamlined Top Bar) ── */}
        <div className="bg-white ounded-lg p-6 sm:p-8 mb-8 border border-slate-200 rounded-lg shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CalendarDays size={32} className="text-burgundy" />
              <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">
                Manage Schedule
              </h1>
            </div>
            <p className="text-slate-600 text-sm sm:text-base ml-11">
              Draft assignments or generate automatically. Resolve conflicts
              contextually.
            </p>
          </div>

          <div className="w-full xl:w-auto flex flex-col items-end gap-3 shrink-0">
            {/* SEM/YEAR SELECTOR */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 w-full sm:w-auto justify-end">
              <CalendarDays size={14} className="text-gray-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-700 shrink-0">
                Generating for:
              </span>
              <select
                className="text-xs font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer"
                value={activeSem.schoolYear}
                onChange={(e) =>
                  setActiveSem((p) => ({ ...p, schoolYear: e.target.value }))
                }
              >
                {["2023-2024", "2024-2025", "2025-2026"].map((sy) => (
                  <option key={sy} value={sy}>
                    {sy}
                  </option>
                ))}
              </select>
              <span className="text-gray-300">·</span>
              <select
                className="text-xs font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer"
                value={activeSem.sem}
                onChange={(e) =>
                  setActiveSem((p) => ({
                    ...p,
                    sem: Number(e.target.value) as 1 | 2,
                  }))
                }
              >
                <option value={1}>1st Semester</option>
                <option value={2}>2nd Semester</option>
              </select>
            </div>

            <div className="flex gap-2 flex-wrap justify-end w-full sm:w-auto">
              {/* NEW SETUP BUTTON */}
              <button
                onClick={() => setModal("setup")}
                disabled={hasExistingSections}
                title={
                  hasExistingSections
                    ? "Sections already exist for this term."
                    : "Setup new sections"
                }
                className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold shadow-sm transition-colors flex-1 sm:flex-none ${
                  hasExistingSections
                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Users size={15} /> Setup Sections
              </button>
              {/* GENERATE BUTTON (Disabled if schedules exist) */}
              <button
                onClick={handleGenerate}
                disabled={generating || scanning || hasExistingSchedules}
                title={
                  hasExistingSchedules
                    ? "Schedules already exist for this term. Please delete them to regenerate."
                    : "Auto-generate schedule"
                }
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 sm:flex-none
                ${
                  generating || scanning || hasExistingSchedules
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                }`}
              >
                <Sparkles size={15} />
                {generating ? "Generating..." : "Generate Schedule"}
              </button>

              <button
                onClick={() => setModal("add")}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8B0000] hover:bg-[#6B0000] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#8B0000]/20 transition-colors flex-1 sm:flex-none"
              >
                <Plus size={15} /> Add Assignment
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ScheduleStatCard
            label="TOTAL ASSIGNMENTS"
            value={schedules.length}
            icon={<BookOpen size={22} />}
            sub="This semester"
          />
          <ScheduleStatCard
            label="DRAFT"
            value={drafts}
            icon={<Clock size={22} />}
            sub="Pending review"
          />
          <ScheduleStatCard
            label="FINALIZED"
            value={finalized}
            icon={<ShieldCheck size={22} />}
            sub="Ready to publish"
          />
          <ScheduleStatCard
            label="PUBLISHED"
            value={published}
            icon={<CheckCircle2 size={22} />}
            sub="Visible on profiles"
          />
        </div>

        {/* ── Contextual Draft Banner (All fix buttons moved here) ── */}
        {drafts > 0 && (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-violet-50 border border-violet-200 rounded-xl">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-base font-bold text-violet-900">
                  {drafts} draft assignment{drafts !== 1 ? "s" : ""} pending
                  check
                </p>
                <p className="text-sm text-violet-700 mt-0.5">
                  Use the tools below to resolve time/room overlaps and balance
                  faculty workloads.
                </p>
              </div>
            </div>

            <button
              onClick={handleFinalize}
              disabled={unresolvedItems.length > 0}
              title={
                unresolvedItems.length > 0
                  ? "Please resolve missing rooms/times first"
                  : "Finalize all drafts"
              }
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-colors ${
                unresolvedItems.length > 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#8B0000] hover:bg-[#6B0000] text-white shadow-[#8B0000]/20"
              }`}
            >
              <ShieldCheck size={14} /> Finalize Schedules
            </button>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleDeterministicFix}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-md shadow-green-200 transition-colors"
              >
                <CheckCircle2 size={14} /> Auto-Fix Rooms
              </button>
              <button
                onClick={() =>
                  aiReport ? setModal("audit") : handleRunAiAudit()
                }
                disabled={isAuditing}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${aiReport ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-300" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
              >
                <Sparkles size={14} />{" "}
                {isAuditing
                  ? "Auditing..."
                  : aiReport
                    ? "View AI Audit"
                    : "AI Schedule Audit"}
              </button>
              <button
                onClick={handleOpenLoadAdvisor}
                disabled={isAdvisorLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-md shadow-violet-200 transition-colors"
              >
                <Users size={14} />{" "}
                {isAdvisorLoading ? "Loading Advisor..." : "AI Load Advisor"}
              </button>
            </div>
          </div>
        )}

        {modal === "audit" && aiReport && (
          <Modal
            title="AI Compliance Audit Report"
            onClose={() => setModal(null)}
            maxWidth="max-w-2xl"
          >
            <div className="bg-gray-50 p-6 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed text-gray-800 font-lexend border border-gray-100 shadow-inner max-h-[60vh] overflow-y-auto">
              {aiReport}
            </div>
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={handleRunAiAudit}
                disabled={isAuditing}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
              >
                <Sparkles size={14} />{" "}
                {isAuditing ? "Re-Auditing..." : "Request Fresh Audit"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                Close Report
              </button>
            </div>
          </Modal>
        )}

        {/* ── Contextual Finalized Banner (Publish button moved here) ── */}
        {finalized > 0 && drafts === 0 && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 size={18} className="text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-green-800">
                {finalized} schedule{finalized !== 1 ? "s" : ""} finalized — no
                conflicts detected.
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                Click <strong>Publish</strong> to make these visible on faculty
                profiles.
              </p>
            </div>
            <button
              onClick={handlePublish}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#8B0000] hover:bg-[#6B0000] text-white rounded-lg text-xs font-bold shadow-md shadow-[#8B0000]/20 transition-colors"
            >
              <CheckCircle2 size={13} /> Publish Now
            </button>
          </div>
        )}

        {/* ── Contextual Unresolved Items Banner ── */}
        {unresolvedItems.length > 0 && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-4">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">
                {unresolvedItems.length} Unresolved Assignment(s)
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                These schedules could not be auto-fixed due to physical
                constraints (no rooms/hours left).
              </p>
            </div>
            <button
              onClick={() => setModal("fixResults")}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md shadow-red-200 transition-colors"
            >
              <Info size={13} /> View List
            </button>
          </div>
        )}

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-6 items-start">
          <div className="space-y-4 w-full">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
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
                    onChange={(e) => setSearch(e.target.value)}
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
                      onClick={() => setView(id as "list" | "timetable")}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${view === id ? "bg-[#8B0000] border-[#8B0000] text-white" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* --- FILTER & SORT WRAPPER --- */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[130px]">
                  <span className="text-xs text-gray-400 shrink-0">Day:</span>
                  <select
                    className={`${inputCls} cursor-pointer`}
                    value={filterDay}
                    onChange={(e) => setFilterDay(e.target.value)}
                  >
                    <option value="All">All Days</option>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[170px]">
                  <span className="text-xs text-gray-400 shrink-0">
                    Faculty:
                  </span>
                  <select
                    className={`${inputCls} cursor-pointer`}
                    value={filterFac}
                    onChange={(e) => setFilterFac(e.target.value)}
                  >
                    <option value="All">All Faculty</option>
                    {FACULTY_LIST.map((f) => (
                      <option key={f.id} value={f.id}>
                        {getFacultyName(f as ReturnType<typeof getFaculty>)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[130px]">
                  <span className="text-xs text-gray-400 shrink-0">
                    Program:
                  </span>
                  <select
                    className={`${inputCls} cursor-pointer`}
                    value={filterProgram}
                    onChange={(e) => setFilterProgram(e.target.value)}
                  >
                    <option value="All">All Programs</option>
                    <option value="BSCS">BSCS</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSIS">BSIS</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                  <span className="text-xs text-gray-400 shrink-0">
                    <DoorOpen size={13} className="inline mr-1 text-gray-400" />
                    Room:
                  </span>
                  <select
                    className={`${inputCls} cursor-pointer`}
                    value={filterRoom}
                    onChange={(e) => setFilterRoom(e.target.value)}
                  >
                    <option value="All">All Rooms</option>
                    {ROOM_LIST.map((r) => (
                      <option key={r.id} value={r.id}>
                        {(r as any).room}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <span className="text-xs text-gray-400 shrink-0">
                    Status:
                  </span>
                  <select
                    className={`${inputCls} cursor-pointer`}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All Stages</option>
                    <option value="draft">Draft</option>
                    <option value="finalized">Finalized</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                {/* --- NEW SORT DROPDOWN --- */}
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <span className="text-xs text-gray-400 shrink-0">Sort:</span>
                  <select
                    className={`${inputCls} cursor-pointer`}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                  >
                    <option value="subject_asc">Subject (A - Z)</option>
                    <option value="subject_desc">Subject (Z - A)</option>
                  </select>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 px-1">
              Showing{" "}
              <span className="font-bold text-gray-800">
                {Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  filtered.length,
                )}{" "}
                - {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
              </span>{" "}
              of {filtered.length} assignments
            </p>

            {filtered.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center text-gray-400">
                <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No assignments found.</p>
              </div>
            ) : (
              <>
                {view === "list" && (
                  <ListView
                    data={paginatedData}
                    otherFacs={otherFacs}
                    otherRooms={otherRooms}
                    onEdit={openEdit}
                    onDelete={openDelete}
                  />
                )}
                {view === "timetable" && (
                  <TimetableView
                    data={filtered}
                    otherFacs={otherFacs}
                    otherRooms={otherRooms}
                    onEdit={openEdit}
                    onDelete={openDelete}
                  />
                )}
              </>
            )}
            {/* 2. Compact Pagination UI */}
            {totalPages > 1 && view === "list" && (
              <div className="flex items-center justify-between px-2 pt-2 pb-8">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Showing{" "}
                  {Math.min(
                    (currentPage - 1) * ITEMS_PER_PAGE + 1,
                    filtered.length,
                  )}
                  -{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of{" "}
                  {filtered.length}
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-burgundy disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((num, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          typeof num === "number" && setCurrentPage(num)
                        }
                        disabled={num === "..."}
                        className={`min-w-[36px] h-9 rounded-lg text-xs font-bold transition-all ${
                          currentPage === num
                            ? "bg-[#8B0000] text-white shadow-md shadow-[#8B0000]/20"
                            : num === "..."
                              ? "text-gray-300 cursor-default"
                              : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-burgundy disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          <LoadMonitorPanel sched={schedules} />
        </div>

        {/* ── Modals ── */}
        {(modal === "add" || modal === "edit") && (
          <ScheduleFormModal
            editing={modal === "edit" ? selected : null}
            onSave={handleSave}
            onClose={closeModal}
            activeSem={activeSem}
            curriculums={curriculums}
            otherFacs={otherFacs}
            otherRooms={otherRooms}
          />
        )}
        {modal === "delete" && selected && (
          <DeleteModal
            schedule={selected}
            onConfirm={handleDelete}
            onClose={closeModal}
          />
        )}
        {modal === "scan" && (
          <ConflictScanModal
            initialConflicts={conflicts}
            onApplyFix={handleApplyFix}
            onApplyTransfers={handleApplyTransfers}
            onClose={closeModal}
            onFinalize={handleFinalize}
          />
        )}
        {modal === "fixResults" && fixResults && (
          <AutoFixResultsModal data={fixResults} onClose={closeModal} />
        )}
        {modal === "setup" && (
          <SetupSectionsModal
            onClose={closeModal}
            activeSem={activeSem}
            onSave={handleSetupSections}
          />
        )}

        {isAdvisorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl font-lexend">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-violet-50">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-violet-600" />
                  <h3 className="text-base font-bold text-violet-900">
                    AI Faculty Load Advisor
                  </h3>
                </div>
                <button
                  onClick={() => setIsAdvisorModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-violet-100/50 flex items-center justify-center text-violet-600 hover:bg-violet-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-5 overflow-y-auto flex-grow bg-white">
                {isAdvisorLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4"></div>
                    <p className="text-sm font-semibold text-violet-600">
                      Analyzing faculty workloads...
                    </p>
                  </div>
                ) : cachedLoadAdvice && cachedLoadAdvice.length > 0 ? (
                  <div className="space-y-3">
                    {cachedLoadAdvice.map((advice, index) => (
                      <div
                        key={index}
                        className="p-4 bg-violet-50/50 border border-violet-100 rounded-xl"
                      >
                        <p className="text-sm font-bold text-violet-900 mb-1.5">
                          {advice.summaryNote}
                        </p>
                        <p className="text-xs text-violet-800 leading-relaxed">
                          {advice.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-10 gap-3 bg-green-50 border border-green-100 rounded-xl">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-green-900 text-base">
                        Load is Balanced!
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        No cross-specialization transfers required at this time.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex justify-between bg-gray-50 items-center">
                <button
                  onClick={generateNewLoadAdvice}
                  disabled={isAdvisorLoading}
                  className="text-xs text-violet-600 hover:text-violet-800 font-bold disabled:opacity-50 flex items-center gap-1"
                >
                  🔄 Recalculate Advice
                </button>
                <button
                  onClick={() => setIsAdvisorModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
