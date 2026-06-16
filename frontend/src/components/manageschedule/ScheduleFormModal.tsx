import { useState, useMemo, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, inputCls } from "../common/Modal";
import { TimePickerClock } from "./TimePickerClock";
import {
  FACULTY_LIST,
  SUBJECT_LIST,
  ROOM_LIST,
  DAYS,
  HOURS_PER_UNIT,
  getSubject,
  getDurationHours,
  isHourUnitMatch,
} from "../../utils/scheduleConflict";
import type { ScheduleAssignment } from "../../utils/geminiSchedHelper";

const EMPTY_FORM: Omit<ScheduleAssignment, "id"> = {
  schedule_id: "",
  faculty_id: "",
  other_faculty_id: null,
  subject_id: "",
  room_id: "",
  other_room_id: null,
  day: "",
  start_time: "",
  end_time: "",
  section: "",
  status: "draft",
};

interface ScheduleFormModalProps {
  editing: ScheduleAssignment | null;
  onSave: (entry: ScheduleAssignment, customFac: string, customRoom: string) => void;
  onClose: () => void;
  activeSem: { schoolYear: string; sem: 1 | 2 };
  curriculums: any[];
  otherFacs?: any[];
  otherRooms?: any[];
}

export function ScheduleFormModal({
  editing,
  onSave,
  onClose,
  activeSem,
  curriculums,
  otherFacs = [],
  otherRooms = [],
}: ScheduleFormModalProps) {
  const [form, setForm] = useState<Omit<ScheduleAssignment, "id">>(
    editing
      ? {
          ...editing,
          faculty_id: editing.other_faculty_id ? "OTHER" : editing.faculty_id || "TBD",
          room_id: editing.other_room_id ? "OTHER" : editing.room_id || "TBD",
        }
      : { ...EMPTY_FORM },
  );

  const getInitialName = (id: string | null | undefined, list: any[], key: string) =>
    id ? list.find((x: any) => x.id === id)?.[key] || "" : "";

  const [customFac, setCustomFac] = useState(
    getInitialName(editing?.other_faculty_id, otherFacs, "faculty_name"),
  );
  const [customRoom, setCustomRoom] = useState(
    getInitialName(editing?.other_room_id, otherRooms, "room_name"),
  );

  const displayFacId = form.other_faculty_id ? "OTHER" : form.faculty_id || "TBD";
  const displayRoomId = form.other_room_id ? "OTHER" : form.room_id || "TBD";

  const formattedSY = parseInt(
    (activeSem.schoolYear.split("-")[0]?.slice(-2) || "") +
      (activeSem.schoolYear.split("-")[1]?.slice(-2) || ""),
  );

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

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
      if (s.semester) return Number(s.semester) === Number(activeSem.sem);
      return true;
    });
    return filtered.sort((a, b) => a.code.localeCompare(b.code));
  }, [activeSem.sem]);

  const availableSections = useMemo(() => {
    const sections: { label: string; subjectIds: string[] }[] = [];
    curriculums.forEach((prog: any) => {
      const termSubs = prog.termSubjects || [];
      prog.sections.forEach((sec: any) => {
        if (Number(sec.school_year) === formattedSY) {
          const matchedTerm = termSubs.find(
            (t: any) =>
              Number(t.year_level) === Number(sec.yearLevel) &&
              Number(t.semester) === Number(activeSem.sem),
          );
          const subjectIds = matchedTerm ? matchedTerm.subject_codes || [] : [];
          sections.push({ label: sec.label, subjectIds });
        }
      });
    });
    return sections.sort((a, b) => a.label.localeCompare(b.label));
  }, [curriculums, activeSem.schoolYear, activeSem.sem]);

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
      setCustomFac(getInitialName(editing.other_faculty_id, otherFacs, "faculty_name"));
    }
    if (editing?.other_room_id && !customRoom) {
      setCustomRoom(getInitialName(editing.other_room_id, otherRooms, "room_name"));
    }
  }, [otherFacs, otherRooms, editing]);

  return (
    <Modal title={editing ? "Edit Assignment" : "Add Assignment"} onClose={onClose}>
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

        {/* Section */}
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
            value={displayFacId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "OTHER") {
                setForm((f) => ({ ...f, faculty_id: "OTHER" }));
              } else {
                setForm((f) => ({ ...f, faculty_id: val, other_faculty_id: null }));
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
            value={displayRoomId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "OTHER") {
                setForm((f) => ({ ...f, room_id: "OTHER" }));
              } else {
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
        <div className="hidden sm:block" />

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
          className={`flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
            isValid
              ? "bg-[#8B0000] hover:bg-[#6B0000]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {editing ? "Save Changes" : "Add to Draft Schedule"}
        </button>
      </div>
    </Modal>
  );
}