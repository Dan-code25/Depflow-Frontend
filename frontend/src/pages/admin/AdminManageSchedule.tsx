// ─────────────────────────────────────────────────────────────────────────────
// ManageSchedule.tsx
// Place this file in: src/pages/admin/ManageSchedule.tsx  (or your pages dir)
//
// This page follows the same patterns as AdminDashboard.tsx:
//   - font-lexend, text-primary, border-t-primary, Tailwind classes only
//   - lucide-react for all icons
//   - TypeScript interfaces for all data shapes
//   - Mock data at the top — swap with your API calls / Supabase queries
//
// EDITABLE SECTIONS are marked with: // ✏️ EDIT
// ─────────────────────────────────────────────────────────────────────────────
import api from "../../services/api"; // adjust path if needed
import { AdminLayout } from "../../components/layout/AdminLayout";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Search, LayoutGrid, TableProperties,
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, X,
  Users, CalendarDays, BookOpen, Clock, DoorOpen, Info,
} from "lucide-react";
import { enrichConflictsWithGemini, type GeminiScheduleContext } from "../../utils/geminiSchedule";
import { generateSchedule, type FacultyUtilization, type MissingEntry, type ScheduleAssignment } from "../../utils/geminiSchedHelper";


type ScheduleStatus = "draft" | "finalized";
type ConflictType   = "HARD" | "SOFT";
type ViewMode = "card" | "timetable";


const getAvatarColor = (f: ReturnType<typeof getFaculty>): string => 
  (f && 'avatarColor' in f && typeof f.avatarColor === 'string' && f.avatarColor) ? f.avatarColor : "bg-gray-400";

interface ConflictFix {
  scheduleId: string;
  field: keyof ScheduleAssignment;
  value: string;
}

// A transfer moves one or more schedule entries to a different faculty member.
// Used for overload resolution so the admin can click once to reassign.
interface ConflictTransfer {
  scheduleId:    string;  // which entry to move
  subjectCode:   string;  // human label for the button
  units:         number;  // subject unit value for display
  toFacultyId:   string;  // destination faculty
  toFacultyName: string;
}
// Alias so new code from previous session compiles without changes
type OverloadTransfer = ConflictTransfer;

interface Conflict {
  id: string;
  type: ConflictType;
  label: string;
  affected: string[];
  message: string;
  suggestion: string;
  fix:       ConflictFix | null;       // single-field patch (day, room, end_time)
  transfers: ConflictTransfer[];       // one-click faculty reassignments
  dismissed: boolean;
  applied: boolean;
}

let FACULTY_LIST: any[] = [];
let SUBJECT_LIST: any[] = [];
let ROOM_LIST: any[] = [];


// Transform mock schedule data to match ScheduleAssignment interface


// ✏️ EDIT — Days of the week for schedule entries
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOURS_PER_UNIT = 1;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getFaculty = (id: string) => FACULTY_LIST.find(f => f.id === id);
const getSubject = (id: string) => SUBJECT_LIST.find(s => s.id === id);
const getRoom    = (id: string) => ROOM_LIST.find(r => r.id === id);
const getFacultyInitials = (f: ReturnType<typeof getFaculty>) => f ? `${f.personal.firstName.charAt(0)}${f.personal.lastName.charAt(0)}`.toUpperCase() : "";
const getFacultyName = (f: ReturnType<typeof getFaculty>) => f ? `${f.personal.firstName} ${f.personal.lastName}` : "Unknown Faculty";
const toMins     = (t: string)  => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const overlaps   = (aS:string,aE:string,bS:string,bE:string) =>
  toMins(aS) < toMins(bE) && toMins(aE) > toMins(bS);

// getTotalUnits — counts academic units using subject.units (the credit value),
// NOT clock hours. This matches how TUP/CHED defines faculty load: a 3-unit
// subject is 3 units of load regardless of whether it meets for 1 hr or 3 hrs.
// Split sessions (same session_group_id) are counted only ONCE.
const getTotalUnits = (sched: ScheduleAssignment[], fid: string): number => {
  const mine = sched.filter(s => s.faculty_id === fid && s.day !== "TBD");
  const deduped = mine.filter((s, _, arr) => {
    if (!s.session_group_id) return true;
    return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
  });
  return deduped.reduce((n, s) => n + (getSubject(s.subject_id)?.units ?? 0), 0);
};

// getFacultyMaxUnits — derived from employment type, NOT f.max_units.
// f.max_units is often absent; employment type is always set.
// Matches the cap logic in geminiSchedHelper.ts exactly.
const getFacultyMaxUnits = (f: ReturnType<typeof getFaculty>): number => {
  if (!f) return 21;
  const emp = (f as any).personal?.employmentType ?? "";
  return emp === "Part-time" ? 12 : 21;
};
const getDurationHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  return (toMins(end) - toMins(start)) / 60;
};

const isHourUnitMatch = (start: string, end: string, units: number): boolean =>
  getDurationHours(start, end) === units * HOURS_PER_UNIT;

function buildGeminiContext(
  sched: ScheduleAssignment[],
  detectedConflicts: Conflict[]
): GeminiScheduleContext {
  return {
    faculty: FACULTY_LIST.map((f) => ({
      id: f.id,
      name: getFacultyName(f as ReturnType<typeof getFaculty>),
      employmentType: f.personal.employmentType,
      maxUnits: getFacultyMaxUnits(f as ReturnType<typeof getFaculty>),
      assignedUnits: getTotalUnits(sched, f.id),
    })),
 
    subjects: SUBJECT_LIST.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      units: s.units,
    })),
 
    schedules: sched.map((s) => {
      const f = getFaculty(s.faculty_id);
      const sub = getSubject(s.subject_id);
      const room = getRoom(s.room_id);
      return {
        id: s.id,
        facultyName: getFacultyName(f),
        subjectCode: sub?.code ?? s.subject_id,
        subjectName: sub?.name ?? "",
        section: s.section,
        room: room?.room ?? s.room_id,
        day: s.day,
        startTime: s.start_time,
        endTime: s.end_time,
        status: s.status,
      };
    }),
 
    detectedConflicts: detectedConflicts.map((c) => ({
      id: c.id,
      type: c.type,
      label: c.label,
      message: c.message,
    })),
  };
}
// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function runConflictScan(sched: ScheduleAssignment[]): Conflict[] {
  const results: Conflict[] = [];
  const seen = new Set<string>();

  // ── Pass 0: "Needs Faculty" soft warning for every TBD entry ────────────────
  // GE/MATH subjects are generated with faculty_id="TBD" intentionally.
  // Flagged as SOFT (not HARD) so they don't block finalization — they're
  // expected to be resolved manually by the admin.
  sched.forEach(s => {
    if (s.faculty_id === "TBD") {
      const sub = getSubject(s.subject_id);
      results.push({
        id: `tbd-fac-${s.id}`,
        type: "SOFT",
        label: "Needs Faculty Assignment",
        affected: [s.id],
        message: `${sub?.code ?? s.subject_id} (${s.section}) has no faculty assigned yet. This is expected for GE/MATH subjects — please assign a faculty member manually.`,
        suggestion: `Open the Edit modal for this entry and select the appropriate faculty from the dropdown.`,
        fix: null,
        transfers: [],
        dismissed: false,
        applied: false,
      });
    }
    // TBD time — no day/time scheduled yet
    if (s.day === "TBD") {
      const sub = getSubject(s.subject_id);
      results.push({
        id: `tbd-time-${s.id}`,
        type: "SOFT",
        label: "Needs Time Assignment",
        affected: [s.id],
        message: `${sub?.code ?? s.subject_id} for ${getFacultyName(getFaculty(s.faculty_id))} (${s.section}) has no day/time scheduled yet — added by minimum-load enforcement.`,
        suggestion: `Open the Edit modal and set the day, start time, and end time for this entry.`,
        fix: null,
        transfers: [],
        dismissed: false,
        applied: false,
      });
    }
  });

  // ── Pass 1: pairwise checks (time overlaps, room double-bookings) ──────────
  sched.forEach((a, i) => {
    sched.forEach((b, j) => {
      if (j <= i) return;
      const key = [a.id, b.id].sort().join("-");
      if (seen.has(key)) return;

      // Hard: time overlap — same faculty, same day, overlapping slots
      // Skip TBD entries — they have no scheduled time yet so cannot overlap
      if (a.faculty_id === b.faculty_id && a.faculty_id !== "TBD" && a.day === b.day && a.day !== "TBD" && overlaps(a.start_time,a.end_time,b.start_time,b.end_time)) {
        seen.add(key);
        const f=getFaculty(a.faculty_id), sA=getSubject(a.subject_id), sB=getSubject(b.subject_id);
        const fixDay = b.day === "Monday" ? "Wednesday" : "Monday";
        results.push({ id:`time-${key}`, type:"HARD", label:"Time Overlap", affected:[a.id,b.id],
          message:`${getFacultyName(f)} is double-booked on ${a.day}: ${sA?.code} (${a.start_time}–${a.end_time}) overlaps with ${sB?.code} (${b.start_time}–${b.end_time}).`,
          suggestion:`Reschedule ${sB?.code} (${b.section}) to ${fixDay} at the same time. No other conflicts found on that day.`,
          fix:{ scheduleId:b.id, field:"day", value:fixDay }, transfers:[], dismissed:false, applied:false });
      }

      // Hard: room double-booking — same room, same day, overlapping slots
      if (a.room_id === b.room_id && a.day === b.day && overlaps(a.start_time,a.end_time,b.start_time,b.end_time)) {
        seen.add(key);
        const r=getRoom(a.room_id), fA=getFaculty(a.faculty_id), fB=getFaculty(b.faculty_id);
        const altRoom = ROOM_LIST.find(x => x.id !== a.room_id && x.id !== b.room_id);
        results.push({ id:`room-${key}`, type:"HARD", label:"Room Double-Booking", affected:[a.id,b.id],
          message:`${r?.room} is double-booked on ${a.day}: assigned to both ${getFacultyName(fA)} and ${getFacultyName(fB)} at overlapping times.`,
          suggestion:`Move ${getFacultyName(fB)}'s class (${getSubject(b.subject_id)?.code}) to ${altRoom?.room ?? "another available room"}.`,
          fix:{ scheduleId:b.id, field:"room_id", value:altRoom?.id ?? b.room_id }, transfers:[], dismissed:false, applied:false });
      }
    });
  });

  // ── Pass 2: per-entry hour mismatch ───────────────────────────────────────
  sched.forEach(s => {
    const sub = getSubject(s.subject_id);
    if (!sub) return;
    if (!isHourUnitMatch(s.start_time, s.end_time, sub.units)) {
      const actual   = getDurationHours(s.start_time, s.end_time);
      const expected = sub.units * HOURS_PER_UNIT;
      results.push({
        id: `unithr-${s.id}`,
        type: "SOFT",
        label: "Hour–Unit Mismatch",
        affected: [s.id],
        message: `${sub.code} (${sub.units} units) for section ${s.section} is scheduled for ${actual} hr${actual !== 1 ? "s" : ""} but should be ${expected} hr${expected !== 1 ? "s" : ""} (1 unit = ${HOURS_PER_UNIT} hr).`,
        suggestion: `Adjust the time slot so the class runs for exactly ${expected} hour${expected !== 1 ? "s" : ""}. Example: if start is ${s.start_time}, set end to ${(() => { const end = toMins(s.start_time) + expected * 60; return `${String(Math.floor(end/60)).padStart(2,"0")}:${String(end%60).padStart(2,"0")}`; })()}.`,
        fix: {
          scheduleId: s.id,
          field: "end_time",
          value: (() => {
            const end = toMins(s.start_time) + expected * 60;
            return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
          })(),
        },
        transfers: [],
        dismissed: false,
        applied: false,
      });
    }
  });

  // ── Pass 3: per-faculty load checks (ONE pass per unique faculty) ─────────
  // Iterating over FACULTY_LIST (not sched) guarantees exactly one conflict
  // entry per faculty — no duplicates regardless of how many schedule entries
  // that faculty has. Previously this ran inside the sched.forEach loop which
  // created one overload-N entry per schedule entry, causing React key collisions.
  FACULTY_LIST.forEach(fRaw => {
    const f = getFaculty(fRaw.id);
    if (!f) return;
    const maxUnits = getFacultyMaxUnits(f);
    // Exclude TBD-time entries from unit count — they have no confirmed schedule
    const confirmedSched = sched.filter(s => s.day !== "TBD");
    const u = getTotalUnits(confirmedSched, fRaw.id);
    if (u === 0) return; // faculty has no confirmed assignments — skip overload check

    // Hard: load overload
    // ID: "overload-fac-{id}" — prefix "fac-" prevents collision when id="1"
    // overlapping with ids like "10","11","12" via substring matching
    if (u > maxUnits) {
      // Build the full assigned-subject list for display
      const myEntries = sched.filter(s => s.faculty_id === fRaw.id);
      const assignedSubjectNames = myEntries
        .filter((s, _, arr) => {
          if (!s.session_group_id) return true;
          return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
        })
        .map(s => {
          const sub = getSubject(s.subject_id);
          return sub ? `${sub.code} (${sub.units}u)` : s.subject_id;
        });
      const excess = u - maxUnits;

      // Pick entries to transfer: sort by hours ascending so smallest go first,
      // stop once cumulative hours covers the excess
      // Deduplicate split sessions before sorting
      const uniqueEntries = myEntries.filter((s, _, arr) => {
        if (!s.session_group_id) return true;
        return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
      });
      const sortedEntries = [...uniqueEntries].sort((a, b) =>
        (getSubject(a.subject_id)?.units ?? 0) - (getSubject(b.subject_id)?.units ?? 0)
      );
      const toTransfer: typeof myEntries = [];
      let covered = 0;
      for (const entry of sortedEntries) {
        if (covered >= excess) break;
        toTransfer.push(entry);
        covered += getSubject(entry.subject_id)?.units ?? 0;
      }

      // Build transfer descriptors for the one-click button
            const transfers: ConflictTransfer[] = toTransfer.map(entry => {
        const sub     = getSubject(entry.subject_id);
        const subId   = entry.subject_id;
        const subUnits = sub?.units ?? 0;
 
        // Score every candidate: must specialise in this subject AND have room
        const candidates = FACULTY_LIST
          .filter(x => {
            if (x.id === fRaw.id) return false;
            const xPrefs = (x as any).preferences;
            if (!xPrefs?.subjectSpecializations?.includes(subId)) return false;
            const xMax  = getFacultyMaxUnits(getFaculty(x.id));
            const xUsed = getTotalUnits(confirmedSched, x.id);
            return xUsed + subUnits <= xMax;
          })
          .sort((a, b) => {
            // Prefer most remaining capacity
            const remA = getFacultyMaxUnits(getFaculty(a.id)) - getTotalUnits(confirmedSched, a.id);
            const remB = getFacultyMaxUnits(getFaculty(b.id)) - getTotalUnits(confirmedSched, b.id);
            return remB - remA;
          });
 
        const target = candidates[0];
        return {
          scheduleId:    entry.id,
          subjectCode:   sub?.code ?? subId,
          units:         subUnits,
          toFacultyId:   target?.id ?? "",
          toFacultyName: target
            ? `${getFacultyName(getFaculty(target.id))} (${getFacultyMaxUnits(getFaculty(target.id)) - getTotalUnits(confirmedSched, target.id)}u remaining)`
            : "No qualified faculty with capacity",
        };
      });

      const toMoveNames = toTransfer.map(e => {
        const sub = getSubject(e.subject_id);
        return sub ? `${sub.code} (${sub.units}u)` : e.subject_id;
      });

      const bestTarget = transfers.find(t => t.toFacultyId);

      results.push({ id:`overload-fac-${fRaw.id}`, type:"HARD", label:"Load Overload",
        affected: myEntries.map(s => s.id),
        message:`${getFacultyName(f)} is assigned ${u} units — ${u - maxUnits} over their ${maxUnits}-unit max. Subjects: [${assignedSubjectNames.join(", ")}].`,
        suggestion: bestTarget
          ? `Transfer ${toMoveNames.join(", ")} to qualified faculty with remaining capacity. Use the one-click Transfer buttons below — each subject is matched to a faculty who can teach it.`
          : `No qualified faculty with sufficient capacity found. Please reassign manually.`,
        fix: null,
        transfers,
        dismissed: false,
        applied: false });
    }

    // Soft: near load limit
    // ID: "near-fac-{id}" — same rationale
    if (u > maxUnits * 0.85 && u <= maxUnits) {
      results.push({ id:`near-fac-${fRaw.id}`, type:"SOFT", label:"Near Load Limit",
        affected: [fRaw.id],
        message:`${getFacultyName(f)} is at ${u}/${maxUnits} units (${Math.round(u/maxUnits*100)}%). Adding more subjects risks overload.`,
        suggestion:`Avoid assigning additional subjects to ${getFacultyName(f)} this semester.`,
        fix:null, transfers:[], dismissed:false, applied:false });
    }
  });

  // ── Pass 4: uneven load distribution (one result for the whole schedule) ──
  const loads = FACULTY_LIST.map(f=>({ f, u:getTotalUnits(sched,f.id), maxUnits: getFacultyMaxUnits(getFaculty(f.id)) })).filter(x=>x.u>0);
  if (loads.length > 1) {
    const mx = Math.max(...loads.map(l=>l.u));
    const mn = Math.min(...loads.map(l=>l.u));
    if (mx - mn >= 6) {
      const hi = loads.find(l=>l.u===mx)!;
      const lo = loads.find(l=>l.u===mn)!;
      results.push({ id:"dist-soft", type:"SOFT", label:"Uneven Load Distribution", affected:loads.map(l=>l.f.id),
        message:`${getFacultyName(hi.f)} has ${mx} units while ${getFacultyName(lo.f)} only has ${mn} — a ${mx-mn}-unit gap.`,
        suggestion:`Consider moving one 3-unit subject from ${getFacultyName(hi.f)} to ${getFacultyName(lo.f)} for a more balanced workload.`,
        fix:null, transfers:[], dismissed:false, applied:false });
    }
  }

  // ── Pass 5: preferred-time soft warnings ─────────────────────────────────
  // Check every confirmed assignment against the faculty's preferred time range.
  // These are pushed FIRST among soft warnings (before uneven load, near-limit,
  // TBD notices) so they appear at the top of the soft section in the scan modal.
  const preferredTimeWarnings: Conflict[] = [];
  sched.forEach(s => {
    if (s.day === "TBD" || s.start_time === "TBD" || s.faculty_id === "TBD") return;
    const fRaw = FACULTY_LIST.find(f => f.id === s.faculty_id);
    if (!fRaw || !("preferences" in fRaw)) return;
    const prefs = (fRaw as any).preferences;
    const prefStart = prefs?.preferredTimeRange?.start;
    const prefEnd   = prefs?.preferredTimeRange?.end;
    if (!prefStart || !prefEnd) return;

    const schedStart = toMins(s.start_time);
    const schedEnd   = toMins(s.end_time);
    const pStart     = toMins(prefStart);
    const pEnd       = toMins(prefEnd);

    if (schedStart < pStart || schedEnd > pEnd) {
      const sub  = getSubject(s.subject_id);
      const name = getFacultyName(getFaculty(s.faculty_id));
      preferredTimeWarnings.push({
        id: `preftime-${s.id}`,
        type: "SOFT",
        label: "Outside Preferred Time",
        affected: [s.id],
        message: `${name} prefers ${prefStart}–${prefEnd} but ${sub?.code ?? s.subject_id} ` +
                 `(${s.section}) is scheduled ${s.start_time}–${s.end_time} on ${s.day}.`,
        suggestion: `Reschedule ${sub?.code ?? s.subject_id} to a slot within ${name}'s preferred window (${prefStart}–${prefEnd}).`,
        fix: null,
        transfers: [],
        dismissed: false,
        applied: false,
      });
    }
  });

  // Merge: preferred-time warnings go FIRST in the results array so they
  // sort to the top of the soft section in ConflictScanModal.
  const hardResults = results.filter(r => r.type === "HARD");
  const softResults = results.filter(r => r.type === "SOFT");
  return [...hardResults, ...preferredTimeWarnings, ...softResults];
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLE UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

// Faculty avatar circle — uses Tailwind bg color class from Faculty.avatarColor
function Avatar({ initials, colorClass, size = "md" }: { initials:string; colorClass:string; size?:"sm"|"md"|"lg" }) {
  const sz = size === "sm" ? "w-7 h-7 text-[11px]" : size === "lg" ? "w-11 h-11 text-base" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} ${colorClass} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

// Status badge pill
function StatusBadge({ status }: { status: ScheduleStatus }) {
  return status === "finalized"
    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-600 inline-block"/>Finalized</span>
    : <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"/>Draft</span>;
}

// Conflict type badge
function ConflictBadge({ type }: { type: ConflictType }) {
  return type === "HARD"
    ? <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">🔴 Hard</span>
    : <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">🟡 Soft</span>;
}

// Input / Select wrapper — consistent with form style
const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white font-lexend";

// ─────────────────────────────────────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, maxWidth="max-w-lg", children }: { title:string; onClose:()=>void; maxWidth?:string; children:React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`bg-white rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl font-lexend`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// CLOCK TIME PICKER
// ─────────────────────────────────────────────────────────────────────────────

function TimePickerClock({
  value,
  onChange,
  minTime,
  placeholder = "Select time...",
}: {
  value: string;
  onChange: (val: string) => void;
  minTime?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hour" | "minute">("hour");

  // Parse "HH:mm" string into hours and minutes
  const parseTime = (t: string) => {
    if (!t) return { h: 7, m: 0 };
    const [h, m] = t.split(":").map(Number);
    return { h, m };
  };

  const { h, m } = parseTime(value);
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm: "AM" | "PM" = h < 12 ? "AM" : "PM";

  // Build "HH:mm" from display hour (1-12), AM/PM, and minutes
  const buildTime = (dh: number, period: "AM" | "PM", mins: number): string => {
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

  // Check if resulting time is below minTime
  const isBelowMin = (newVal: string) => {
    if (!minTime || !newVal) return false;
    return newVal <= minTime;
  };

  // Clock geometry
  const SIZE    = 208;
  const CENTER  = SIZE / 2;
  const RADIUS  = 78;
  const BTN     = 32; // button diameter

  const getPos = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: CENTER + RADIUS * Math.cos(angle) - BTN / 2,
      y: CENTER + RADIUS * Math.sin(angle) - BTN / 2,
    };
  };

  const handRotation = mode === "hour"
    ? ((displayHour % 12) / 12) * 360
    : (m / 60) * 360;

  const handLength = RADIUS - 14;
  const displayValue = value
    ? `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`
    : null;

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setMode("hour"); }}
        className={`${inputCls} flex items-center justify-between gap-2`}
      >
        <span className={displayValue ? "text-gray-800" : "text-gray-400"}>
          {displayValue ?? placeholder}
        </span>
        <Clock size={15} className="text-gray-400 shrink-0" />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 p-4 w-[232px]">

          {/* Time display row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setMode("hour")}
                className={`text-[22px] font-black px-1.5 py-0.5 rounded-lg transition-colors
                  ${mode === "hour" ? "bg-[#FFF3F3] text-primary" : "text-gray-400 hover:bg-gray-50"}`}
              >
                {String(displayHour).padStart(2, "0")}
              </button>
              <span className="text-[22px] font-black text-gray-200 select-none">:</span>
              <button
                onClick={() => setMode("minute")}
                className={`text-[22px] font-black px-1.5 py-0.5 rounded-lg transition-colors
                  ${mode === "minute" ? "bg-[#FFF3F3] text-primary" : "text-gray-400 hover:bg-gray-50"}`}
              >
                {String(m).padStart(2, "0")}
              </button>
            </div>
            {/* AM / PM toggle */}
            <div className="flex flex-col gap-1">
              {(["AM", "PM"] as const).map(period => (
                <button
                  key={period}
                  onClick={() => toggleAmPm(period)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors
                    ${ampm === period ? "bg-primary text-white" : "text-gray-400 hover:bg-gray-100"}`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Mode label */}
          <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-semibold mb-2">
            {mode === "hour" ? "Select Hour" : "Select Minute"}
          </p>

          {/* Clock face */}
          <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full bg-gray-50 border-2 border-gray-100" />

            {/* Tick marks */}
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = (i / 60) * 360;
              const isMajor = i % 5 === 0;
              return (
                <div
                  key={i}
                  className={`absolute ${isMajor ? "bg-gray-300" : "bg-gray-200"}`}
                  style={{
                    width:  isMajor ? 2 : 1,
                    height: isMajor ? 8 : 5,
                    left:   CENTER - (isMajor ? 1 : 0.5),
                    top:    6,
                    transformOrigin: `50% ${CENTER - 6}px`,
                    transform: `rotate(${angle}deg)`,
                  }}
                />
              );
            })}

            {/* Clock hand */}
            <div
              className="absolute bg-primary rounded-full"
              style={{
                width:          3,
                height:         handLength,
                left:           CENTER - 1.5,
                top:            CENTER - handLength,
                transformOrigin: "50% 100%",
                transform:      `rotate(${handRotation}deg)`,
                transition:     "transform 0.15s ease",
              }}
            />

            {/* Hand base dot */}
            <div
              className="absolute bg-primary rounded-full z-10"
              style={{ width: 8, height: 8, left: CENTER - 4, top: CENTER - 4 }}
            />

            {/* Hour numbers */}
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
                    className={`absolute w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-all
                      ${isSelected
                        ? "bg-primary text-white shadow-md scale-110"
                        : wouldBeInvalid
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-700 hover:bg-[#FFF3F3] hover:text-primary"
                      }`}
                    style={{ left: pos.x, top: pos.y }}
                  >
                    {hour}
                  </button>
                );
              })}

            {/* Minute markers */}
            {mode === "minute" &&
              [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min, idx) => {
                const pos = getPos(idx, 12);
                const isSelected = m === min;
                const wouldBeInvalid = isBelowMin(buildTime(displayHour, ampm, min));
                return (
                  <button
                    key={min}
                    onClick={() => !wouldBeInvalid && selectMinute(min)}
                    disabled={wouldBeInvalid}
                    className={`absolute w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center transition-all
                      ${isSelected
                        ? "bg-primary text-white shadow-md scale-110"
                        : wouldBeInvalid
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-700 hover:bg-[#FFF3F3] hover:text-primary"
                      }`}
                    style={{ left: pos.x, top: pos.y }}
                  >
                    {String(min).padStart(2, "0")}
                  </button>
                );
              })}
          </div>

          {/* Confirm button (minute mode only) */}
          {mode === "minute" && (
            <button
              onClick={() => { setOpen(false); setMode("hour"); }}
              className="w-full mt-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Confirm Time
            </button>
          )}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// FORM MODAL (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<ScheduleAssignment,"id"> = {
  faculty_id: "", subject_id: "", room_id: "", day: "", start_time: "", end_time: "", section: "", status: "draft",
  session_group_id: undefined
};

function ScheduleFormModal({ editing, onSave, onClose }: {
  editing: ScheduleAssignment | null;
  onSave: (entry: ScheduleAssignment) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<ScheduleAssignment,"id">>(editing ? { ...editing } : { ...EMPTY_FORM });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isValid = !!(form.faculty_id && form.subject_id && form.room_id && form.day && form.start_time && form.end_time && form.section);
  const selectedSubject = getSubject(form.subject_id);
  const durationHours   = getDurationHours(form.start_time, form.end_time);
  const hoursMismatch   = !!(form.start_time && form.end_time && selectedSubject && !isHourUnitMatch(form.start_time, form.end_time, selectedSubject.units));

  return (
    <Modal title={editing ? "Edit Assignment" : "Add Assignment"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">

        {/* Faculty */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Faculty Member <span className="text-red-500">*</span></label>
          <select className={inputCls} value={form.faculty_id} onChange={e=>set("faculty_id",e.target.value)}>
            <option value="">Select faculty...</option>
            {FACULTY_LIST.map(f=><option key={f.id} value={f.id}>{f.personal.firstName} {f.personal.lastName}</option>)}
          </select>
        </div>

        {/* Subject */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject <span className="text-red-500">*</span></label>
          <select className={inputCls} value={form.subject_id} onChange={e=>set("subject_id",e.target.value)}>
            <option value="">Select subject...</option>
            {SUBJECT_LIST.map(s=><option key={s.id} value={s.id}>{s.code} — {s.name} ({s.units} units)</option>)}
          </select>
        </div>

        {/* Section */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Section <span className="text-red-500">*</span></label>
          <input className={inputCls} placeholder="e.g. BSIT-2A" value={form.section} onChange={e=>set("section",e.target.value)}/>
        </div>

        {/* Room */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Room <span className="text-red-500">*</span></label>
          <select className={inputCls} value={form.room_id} onChange={e=>set("room_id",e.target.value)}>
            <option value="">Select room...</option>
            {ROOM_LIST.map(r=><option key={r.id} value={r.id}>{r.room}</option>)}
          </select>
        </div>

        {/* Day */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Day <span className="text-red-500">*</span></label>
          <select className={inputCls} value={form.day} onChange={e=>set("day",e.target.value)}>
            <option value="">Select day...</option>
            {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Time <span className="text-red-500">*</span></label>
          <TimePickerClock
            value={form.start_time}
            onChange={val => { set("start_time", val); set("end_time", ""); }}
            placeholder="Select start time..."
          />
        </div>

        {/* End Time */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Time <span className="text-red-500">*</span></label>
          <TimePickerClock
            value={form.end_time}
            onChange={val => set("end_time", val)}
            minTime={form.start_time}
            placeholder="Select end time..."
          />
        </div>
      </div>

      {/* Info note */}
      {/* Hour / unit mismatch warning */}
      {hoursMismatch && selectedSubject && (
        <div className="mt-4 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
          <span>
            <strong>{selectedSubject.code}</strong> is {selectedSubject.units} unit{selectedSubject.units !== 1 ? "s" : ""} — requires exactly <strong>{selectedSubject.units * HOURS_PER_UNIT} hr{selectedSubject.units !== 1 ? "s" : ""}</strong> of class time (1 unit = {HOURS_PER_UNIT} hr). Current slot is <strong>{durationHours} hr{durationHours !== 1 ? "s" : ""}</strong>.
          </span>
        </div>
      )}

      {/* Hour / unit match confirmation */}
      {!hoursMismatch && form.start_time && form.end_time && selectedSubject && (
        <div className="mt-4 flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5"/>
          <span>
            Time slot matches — <strong>{durationHours} hr{durationHours !== 1 ? "s" : ""}</strong> assigned for a <strong>{selectedSubject.units}-unit</strong> subject. ✓
          </span>
        </div>
      )}

      {/* Info note */}
      <div className="mt-2 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <AlertTriangle size={14} className="shrink-0 mt-0.5"/>
        <span>Conflict detection runs on the full schedule. Add all assignments first, then click <strong>Run AI Conflict Scan</strong>.</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => isValid && onSave({ ...form, id: editing?.id ?? String(Date.now()) } as ScheduleAssignment)}
          disabled={!isValid}
          className={`flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${isValid ? "bg-primary hover:bg-primary/90" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
          {editing ? "Save Changes" : "Add to Draft Schedule"}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────

function DeleteModal({ schedule, onConfirm, onClose }: { schedule:ScheduleAssignment; onConfirm:()=>void; onClose:()=>void }) {
  const f = getFaculty(schedule.faculty_id);
  const s = getSubject(schedule.subject_id);
  return (
    <Modal title="Remove Assignment" onClose={onClose} maxWidth="max-w-sm">
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
          <Trash2 size={22}/>
        </div>
        <p className="font-bold text-gray-900 mb-2">Remove this assignment?</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-700">{s?.code} — {s?.name}</span><br/>
          Assigned to <span className="font-semibold">{getFacultyName(f)}</span> on <span className="font-semibold">{schedule.day}</span> ({schedule.start_time}–{schedule.end_time})
        </p>
        <p className="text-xs text-red-500 mt-2">This action cannot be undone.</p>
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-semibold text-white transition-colors">Remove</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT CARD (inside scan results modal)
// ─────────────────────────────────────────────────────────────────────────────

function ConflictCard({ c, onApply, onDismiss, onTransfer }: {
  c: Conflict;
  onApply: ((c: Conflict) => void) | null;
  onDismiss: ((id: string) => void) | null;
  onTransfer: ((t: OverloadTransfer) => void) | null;
}) {
  const isHard = c.type === "HARD";
  const hasTransfers = (c.transfers?.length ?? 0) > 0;

  return (
    <div className={`rounded-xl border p-4 mb-3 ${isHard ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${isHard ? "text-red-500" : "text-amber-500"}`}/>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <ConflictBadge type={c.type}/>
            <span className={`text-xs font-bold ${isHard ? "text-red-700" : "text-amber-700"}`}>{c.label}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{c.message}</p>

          {/* One-click transfer panel for overload conflicts */}
          {hasTransfers && onTransfer ? (
            <div className="bg-white/80 border border-red-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck size={11} className="text-red-600"/>
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">One-Click Transfers</span>
                <span className="ml-auto text-[10px] text-gray-400">Click a row to reassign that subject</span>
              </div>
              {c.transfers!.map(t => (
                <div key={t.scheduleId} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">{t.subjectCode}
                      <span className="ml-1.5 text-[10px] font-normal text-gray-400">({t.units}u)</span>
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">→ {t.toFacultyName}</p>
                  </div>
                  <button
                    onClick={() => onTransfer(t)}
                    disabled={!t.toFacultyId}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors
                      ${t.toFacultyId
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                  >
                    <ShieldCheck size={11}/> Transfer
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* AI suggestion box for non-transfer conflicts */
            <div className="bg-white/70 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={11} className="text-violet-600"/>
                <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wide">AI Suggested Fix</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{c.suggestion}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        {onApply && (
          <button onClick={()=>onApply(c)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-colors ${isHard ? "bg-primary hover:bg-primary/90" : "bg-violet-600 hover:bg-violet-700"}`}>
            <ShieldCheck size={13}/> Apply Suggestion
          </button>
        )}
        {onDismiss && (
          <button onClick={()=>onDismiss(c.id)} className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CONFLICT SCAN RESULTS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ConflictScanModal({ initialConflicts, onApplyFix, onApplyTransfers, onClose, onFinalize }: {
  initialConflicts: Conflict[];
  onApplyFix: (fix: Conflict["fix"]) => void;
  onApplyTransfers: (transfers: ConflictTransfer[]) => void;
  onClose: () => void;
  onFinalize: () => void;
}) {
  const [conflicts, setConflicts] = useState<Conflict[]>(initialConflicts);
  useEffect(() => {
    setConflicts(initialConflicts);
  }, [initialConflicts]);
  const hard     = conflicts.filter(c=>c.type==="HARD"&&!c.dismissed&&!c.applied);
  const soft     = conflicts.filter(c=>c.type==="SOFT"&&!c.dismissed&&!c.applied);
  const resolved = conflicts.filter(c=>c.dismissed||c.applied);
  const canFinalize = hard.length === 0;

  const handleApply   = (c: Conflict) => { onApplyFix(c.fix); setConflicts(p=>p.map(x=>x.id===c.id?{...x,applied:true}:x)); };
  const handleDismiss = (id: string)  => setConflicts(p=>p.map(c=>c.id===id?{...c,dismissed:true}:c));
  const handleTransfer = (conflictId: string, t: ConflictTransfer) => {
    // Apply a single transfer immediately
    onApplyTransfers([t]);
    // Remove this transfer from the conflict's list; mark applied when all done
    setConflicts(p => p.map(c => {
      if (c.id !== conflictId) return c;
      const remaining = c.transfers.filter(x => x.scheduleId !== t.scheduleId);
      return { ...c, transfers: remaining, applied: remaining.length === 0 };
    }));
  };

  return (
    <Modal title="AI Conflict Scan Results" onClose={onClose} maxWidth="max-w-2xl">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className={`rounded-xl border p-4 text-center ${hard.length ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
          <div className={`text-3xl font-black ${hard.length ? "text-red-600" : "text-green-600"}`}>{hard.length}</div>
          <div className={`text-xs font-bold mt-1 ${hard.length ? "text-red-600" : "text-green-600"}`}>Hard Conflicts</div>
        </div>
        <div className={`rounded-xl border p-4 text-center ${soft.length ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
          <div className={`text-3xl font-black ${soft.length ? "text-amber-600" : "text-gray-400"}`}>{soft.length}</div>
          <div className={`text-xs font-bold mt-1 ${soft.length ? "text-amber-600" : "text-gray-400"}`}>Soft Warnings</div>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-center">
          <div className="text-3xl font-black text-violet-600">{resolved.length}</div>
          <div className="text-xs font-bold text-violet-600 mt-1">Resolved</div>
        </div>
      </div>

      {/* Hard conflicts */}
      {hard.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mb-3">
            <AlertTriangle size={13}/> Hard Conflicts — must be resolved before finalizing
          </p>
          {hard.map(c=>(
            <ConflictCard
              key={c.id} c={c}
              onApply={c.fix ? handleApply : null}
              onDismiss={null}
              onTransfer={c.transfers?.length ? (t) => handleTransfer(c.id, t) : null}
            />
          ))}
        </div>
      )}

      {/* Soft warnings */}
      {soft.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-amber-600 flex items-center gap-1.5 mb-3">
            <AlertTriangle size={13}/> Soft Warnings — can be dismissed
          </p>
          {soft.map(c=>(
            <ConflictCard
              key={c.id} c={c}
              onApply={c.fix ? handleApply : null}
              onDismiss={handleDismiss}
              onTransfer={null}
            />
          ))}
        </div>
      )}

      {/* All clear */}
      {hard.length === 0 && soft.length === 0 && (
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 size={28}/>
          </div>
          <p className="font-bold text-gray-900">No conflicts remaining!</p>
          <p className="text-sm text-gray-500">The schedule is clear and ready to finalize.</p>
        </div>
      )}

      {/* Resolved list */}
      {resolved.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mt-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Resolved</p>
          {resolved.map(c=>(
            <div key={c.id} className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg mb-1.5 text-xs text-gray-500">
              <CheckCircle2 size={13} className="text-green-500"/>{c.label} — {c.applied?"Fix applied":"Dismissed"}
            </div>
          ))}
        </div>
      )}

      {/* Finalize button */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <button onClick={()=>canFinalize&&onFinalize()} disabled={!canFinalize}
          className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${canFinalize ? "bg-primary text-white hover:bg-primary/90" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
          <ShieldCheck size={16}/>
          {canFinalize ? "Finalize & Publish Schedule" : `Resolve ${hard.length} hard conflict${hard.length!==1?"s":""} to finalize`}
        </button>
      </div>
    </Modal>
  );
}

/// ─────────────────────────────────────────────────────────────────────────────
// CARD VIEW
// ─────────────────────────────────────────────────────────────────────────────

function CardView({ data, onEdit, onDelete }: { data:ScheduleAssignment[]; onEdit:(s:ScheduleAssignment)=>void; onDelete:(s:ScheduleAssignment)=>void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map(s=>{
        const f=getFaculty(s.faculty_id),sub=getSubject(s.subject_id),r=getRoom(s.room_id);
        return (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
            {/* Colored top accent — dynamically matched to faculty color */}
            <div className={`h-1.5 ${getAvatarColor(f)}`}/>
            <div className="p-4">
              {/* Faculty row — TBD entries show amber "Needs Faculty" badge */}
              <div className="flex items-center justify-between mb-3">
                {s.faculty_id === "TBD" ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Users size={13} className="text-amber-600"/>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-700">Needs Faculty</p>
                      <p className="text-[11px] text-amber-500">Click Edit to assign</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={getFacultyInitials(f)} colorClass={getAvatarColor(f)} size="sm"/>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{getFacultyName(f)}</p>
                      <p className="text-[11px] text-gray-400">{f?.personal.designation}</p>
                    </div>
                  </div>
                )}
                <StatusBadge status={s.status}/>
              </div>

              {/* Subject block */}
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <p className="text-sm font-black text-primary">{sub?.code}</p>
                <p className="text-xs text-gray-700 mt-0.5">{sub?.name}</p>
                <p className="text-[11px] text-gray-400 mt-1">{sub?.units} units · {s.section}</p>
              </div>

              {/* Info grid — TBD time shows amber instead of gray */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {([["Day", s.day], ["Time", s.start_time === "TBD" ? "TBD" : `${s.start_time}–${s.end_time}`]] as [string,string][]).map(([k,v])=>(
                  <div key={k} className={`rounded-lg p-2 ${v==="TBD" ? "bg-amber-50" : "bg-gray-50"}`}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{k}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${v==="TBD" ? "text-amber-600 italic" : "text-gray-700"}`}>{v}</p>
                  </div>
                ))}
                <div className="col-span-2 bg-gray-50 rounded-lg p-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Room</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">{r?.room ?? "—"}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={()=>onEdit(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <Pencil size={12}/> Edit
                </button>
                <button onClick={()=>onDelete(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-200 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={12}/> Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE VIEW
// ─────────────────────────────────────────────────────────────────────────────

// ✏️ EDIT — timetable slot height in pixels and start hour
const SLOT_H  = 56;
const START_H = 7; // 07:00
const TIME_LABELS = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00", "18:00", "19:00", "20:00"];

const SNAP_MINS = 30; 
const PIXELS_PER_MIN = SLOT_H / 60

function TimetableView({ data, onEdit, onDelete }: { data:ScheduleAssignment[]; onEdit:(s:ScheduleAssignment)=>void; onDelete:(s:ScheduleAssignment)=>void }) {
  const [ghost, setGhost] = useState<{ day: string; start: string; end: string } | null>(null);
  const [draggedItem, setDraggedItem] = useState<ScheduleAssignment | null>(null);
  const byDay = useMemo(()=>{
    const m: Record<string,ScheduleAssignment[]> = {};
    DAYS.forEach(d=>{ m[d]=[]; });
    data.forEach(s=>{ if(m[s.day]) m[s.day].push(s); });
    return m;
  },[data]);

  const handleDragStart = (e: React.DragEvent, s: ScheduleAssignment) => {
    setDraggedItem(s);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, day: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    // Snapping logic to solve "Challenge: Snapping"
    const rawMins = (mouseY / SLOT_H) * 60; 
    const snappedMins = Math.round(rawMins / SNAP_MINS) * SNAP_MINS;
    
    const startTotalMins = (START_H * 60) + snappedMins;
    const duration = toMins(draggedItem.end_time) - toMins(draggedItem.start_time);
    
    const toHHMM = (m: number) => `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;
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

  const height = (s:string, e:string) => Math.max((toMins(e)-toMins(s))/60*SLOT_H - 4, 28);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b border-gray-100 sticky top-0 bg-white z-10" style={{ gridTemplateColumns:"52px repeat(5,1fr)" }}>
        <div className="border-r border-gray-100"/>
        {DAYS.map(d=>(
          <div key={d} className="py-3 text-center text-xs font-bold text-gray-700 border-r border-gray-100">{d.slice(0,3)}</div>
        ))}
      </div>

      {/* Grid body */}
      <div className="grid" style={{ gridTemplateColumns:"52px repeat(5,1fr)" }}>
        {/* Time labels column */}
        <div className="border-r border-gray-100">
          {TIME_LABELS.map(t=>(
            <div key={t} style={{ height:SLOT_H }} className="flex items-start justify-end pr-2 pt-1 text-[10px] text-gray-400 font-medium border-b border-gray-50">{t}</div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map(day=>(
          <div 
            key={day} 
            className="relative border-r border-gray-100"
            onDragOver={(e) => handleDragOver(e, day)} // Add this
            onDrop={handleDrop}                       // Add this
            onDragLeave={() => setGhost(null)}        // Add this
          >
            {TIME_LABELS.map((t,i)=>(
              <div key={t} style={{ height:SLOT_H }} className={`border-b ${i%2===0?"border-gray-100":"border-dashed border-gray-50"} ${i%2!==0?"bg-gray-50/40":""}`}/>
            ))}
            {/* GHOST PREVIEW (Challenge: Ghosting Effect) */}
            {ghost && ghost.day === day && (
              <div 
                className="absolute left-1 right-1 rounded-lg border-2 border-dashed border-primary bg-primary/5 z-0 pointer-events-none"
                style={{ 
                  top: (toMins(ghost.start) - (START_H * 60)) * PIXELS_PER_MIN + 2,
                  height: (toMins(ghost.end) - toMins(ghost.start)) * PIXELS_PER_MIN - 4 
                }}
              />
            )}

            {/* Assignment blocks */}
            {byDay[day].map(s=>{
              const f=getFaculty(s.faculty_id), sub=getSubject(s.subject_id), r = getRoom(s.room_id);
              const blockH = height(s.start_time, s.end_time);
              return (
                  <div key={s.id}
                    draggable                             // Add this
                    onDragStart={(e) => handleDragStart(e, s)} // Add this
                    className={`absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden cursor-pointer group border-l-2 border-l-primary bg-[#FFF3F3] hover:bg-[#FFE8E8] transition-colors ${draggedItem?.id === s.id ? 'opacity-20' : ''}`} // Add opacity
                    style={{ 
                      top: (toMins(s.start_time) - START_H*60) * PIXELS_PER_MIN + 2, 
                      height: blockH - 4,
                    }}>
                  <p className="text-[10px] font-black text-primary truncate">{sub?.code}</p>
                  {blockH > 38 && <p className="text-[10px] text-gray-600 truncate">{getFacultyInitials(f)} · {s.section}</p>}
                  {blockH > 56 && <p className="text-[10px] text-gray-400">{s.start_time}–{s.end_time}</p>}
                  {blockH > 72 && <p className="text-[10px] text-gray-400 truncate">📍 {r?.room ?? "No room"}</p>}
                  {blockH > 74 && (
                    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e=>{e.stopPropagation();onEdit(s);}} className="flex-1 bg-primary text-white text-[9px] font-bold rounded py-0.5">Edit</button>
                      <button onClick={e=>{e.stopPropagation();onDelete(s);}} className="flex-1 bg-red-500 text-white text-[9px] font-bold rounded py-0.5">Del</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap gap-4">
            {FACULTY_LIST.map(f=>(
            <div key={f.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-2.5 h-2.5 rounded-sm ${getAvatarColor(f)}`}/>
                {getFacultyName(f)}
            </div>
            ))}
        </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD MONITOR SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

function LoadMonitorPanel({ sched }: { sched: ScheduleAssignment[] }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <p className="text-sm font-bold text-gray-900 mb-0.5">Load Monitor</p>
      <p className="text-xs text-gray-400 mb-4">Units assigned this semester</p>

      <div className="space-y-4">
        {FACULTY_LIST.map(f=>{
          const u = getTotalUnits(sched, f.id);
          const maxUnits = getFacultyMaxUnits(f);
          const pct = Math.min(u/maxUnits*100, 100);
          const barColor = pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-amber-400" : "bg-green-500";
          const valColor = pct >= 100 ? "text-red-600" : pct >= 85 ? "text-amber-600" : "text-green-600";
          return (
            <div key={f.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <Avatar initials={getFacultyInitials(f)} colorClass={getAvatarColor(f)} size="sm"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{getFacultyName(f)}</p>
                  <p className="text-[10px] text-gray-400">{f.personal.employmentType}</p>
                </div>
                <span className={`text-sm font-black ${valColor}`}>
                  {u}<span className="text-[10px] text-gray-400 font-normal">/{maxUnits}</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width:`${pct}%` }}/>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-xl text-[11px] text-gray-500 leading-loose">
        🟢 Under 85% — Balanced<br/>
        🟡 85–99% — Near limit<br/>
        🔴 100%+ — Overloaded
      </div>
      <div className="mt-2 p-3 bg-[#FFF3F3] border border-primary/10 rounded-xl text-[11px] text-gray-500 leading-loose">
        <p className="font-bold text-primary mb-1">Unit/Hour Rule</p>
        1 unit = {HOURS_PER_UNIT} hr of class time<br/>
        Exceeding this flags a <span className="font-bold text-red-600">Hard Conflict</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD (local, matches StatCard pattern from AdminDashboard)
// ─────────────────────────────────────────────────────────────────────────────

function ScheduleStatCard({ label, value, icon, sub }: { label:string; value:number; icon:React.ReactNode; sub?:string }) {
  return (
    <div className="bg-white border-t-4 border-t-primary rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div className="bg-[#FFF3F3] p-2.5 rounded-lg text-primary">{icon}</div>
      <div>
        <p className="text-xs font-bold text-gray-400 tracking-wider">{label}</p>
        <p className="text-2xl font-black text-primary leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ManageSchedule() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [schedules,      setSchedules]      = useState<ScheduleAssignment[]>([]);
  const [view,           setView]           = useState<ViewMode>("card");
  const [search,         setSearch]         = useState("");
  const [filterDay,      setFilterDay]      = useState("All");
  const [filterFac,      setFilterFac]      = useState("All");
  const [filterProgram,  setFilterProgram]  = useState("All");
  const [filterRoom,     setFilterRoom]     = useState("All");
  const [modal,          setModal]          = useState<"add"|"edit"|"delete"|"scan"|"reasoning"|null>(null);
  const [selected,       setSelected]       = useState<ScheduleAssignment|null>(null);
  const [conflicts,      setConflicts]      = useState<Conflict[]>([]);
  const [scanning,       setScanning]       = useState(false);
  const [scanned,        setScanned]        = useState(false);
  const [isDataLoaded,   setIsDataLoaded]   = useState(false); // <-- NEW

  const [lastReasoning,  setLastReasoning]  = useState<{
    perProgram: Record<string, string>;
    utilization: FacultyUtilization[];
    missingEntries: MissingEntry[];
    wasFixed: boolean;
    apiCalls: number;
    sem: 1 | 2;
    schoolYear: string;
  } | null>(null);

  const [activeSem, setActiveSem] = useState<{ schoolYear: string; sem: 1 | 2 }>({
    schoolYear: "2024-2025",
    sem: 1,
  });


const API_BASE = "http://localhost:3000/api/manage-schedule";

useEffect(() => {
  const loadData = async () => {
    try {
      const [facRes, subRes, roomRes, schedRes] = await Promise.all([
        api.get("/manage-schedule/faculty"),
        api.get("/manage-schedule/subjects"),
        api.get("/manage-schedule/rooms"),
        api.get("/manage-schedule/schedules"),
      ]);

      const toArray = (d: any) =>
        Array.isArray(d) ? d : d?.data ?? d?.items ?? d?.result ?? [];

      const facData  = toArray(facRes.data);
      const subData  = toArray(subRes.data);
      const roomData = toArray(roomRes.data);
      const schedData = toArray(schedRes.data);

      FACULTY_LIST = facData.map((f: any) => ({
        id: f.id,
        personal: f.personal ?? {
          firstName:      f.first_name      || f.firstName,
          lastName:       f.last_name       || f.lastName,
          employmentType: f.employment_type || f.employmentType,
          status:         f.status          ?? "Active",
        },
        preferences: f.preferences ?? {}
      }));

      SUBJECT_LIST = subData.map((s: any) => ({
        id:             s.subject_code,
        code:           s.subject_code,
        name:           s.subject_name,
        units:          s.units,
        facilityType:   s.facility_type   ?? "lecture",
        assignmentMode: s.assignment_mode ?? "auto",
        canSplit:       s.can_split       ?? false,
        splitPattern:   s.split_pattern   ?? null,
      }));

      ROOM_LIST = roomData.map((r: any) => ({
        id:       r.id,
        room:     r.room,
        type:     r.type     ?? "lecture",
        capacity: r.capacity ?? 40,
      }));

      setSchedules(schedData.map((s: any) => ({
        id:               s.id,
        faculty_id:       s.faculty_id,
        subject_id:       s.subject_id,
        room_id:          s.room_id,
        day:              s.day,
        start_time:       s.start_time,
        end_time:         s.end_time,
        section:          s.section,
        status:           s.status          ?? "draft",
        session_group_id: s.session_group_id,
        session_hours:    s.session_hours,
      })));

      setIsDataLoaded(true);
    } catch (error) {
      console.error("Failed to load database records:", error);
    }
  };

  loadData();
}, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const drafts    = schedules.filter(s=>s.status==="draft").length;
  const finalized = schedules.filter(s=>s.status==="finalized").length;

  const filtered = useMemo(()=>schedules.filter(s=>{
    const f=getFaculty(s.faculty_id), sub=getSubject(s.subject_id), q=search.toLowerCase();
    const sectionProgram = s.section.trim().split(" ")[0].toUpperCase();
    const programMatch = filterProgram === "All" || sectionProgram === filterProgram;
    const roomMatch    = filterRoom    === "All" || String(s.room_id) === filterRoom;
    return (
      (!search || getFacultyName(f).toLowerCase().includes(q) || sub?.name.toLowerCase().includes(q) || sub?.code.toLowerCase().includes(q) || s.section.toLowerCase().includes(q)) &&
      (filterDay==="All" || s.day===filterDay) &&
      (filterFac==="All" || s.faculty_id===filterFac) &&
      programMatch &&
      roomMatch
    );
  }), [schedules, search, filterDay, filterFac, filterProgram, filterRoom, isDataLoaded]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openEdit   = (s:ScheduleAssignment) => { setSelected(s); setModal("edit");   };
  const openDelete = (s:ScheduleAssignment) => { setSelected(s); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); };

const handleSave = async (entry: ScheduleAssignment) => {
  try {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    // Fetch academic periods to get period_id
    const periodsRes = await fetch("http://localhost:3000/api/academic-periods", { headers });
    const periodsArray = await periodsRes.json();
    const periods = Array.isArray(periodsArray) ? periodsArray : periodsArray?.data || [];
    
    // For now, use the first available period or current period
    let period = periods.find((p: any) => p.is_current || p.isCurrent) || periods[0];

    // If no period exists, create one automatically
    if (!period) {
      try {
        const createRes = await fetch("http://localhost:3000/api/academic-periods", {
          method: "POST",
          headers,
          body: JSON.stringify({
            academic_year: "2024-2025",
            semester: "1",  // ✅ convert to string
            is_current: true,
          }),
        });
        period = await createRes.json();
      } catch (err) {
        console.error("Failed to create academic period:", err);
        alert("No academic period found and failed to create one.");
        return;
      }
    }

    const periodId = period?.period_id || period?.id;

    if (!periodId) {
      alert("No academic period found. Please create one first.");
      return;
    }

    // Find subject to get subject_code
    const subject = SUBJECT_LIST.find((s: any) => s.id === entry.subject_id);
    const subjectCode = subject?.code || entry.subject_id;

    const payload = {
      faculty_id:       entry.faculty_id,
      subject_code:     subjectCode,  // ✅ use subject_code not subject_id
      room_id:          entry.room_id,
      period_id:        periodId,     // ✅ required
      day_of_week:      entry.day,    // ✅ use day_of_week not day
      start_time:       entry.start_time,
      end_time:         entry.end_time,
      section:          entry.section,
      is_ai_generated:  false,        // ✅ manually added
    };

    if (modal === "edit") {
      await fetch(`${API_BASE}/schedules/${entry.id}`, {
        method: "PATCH", headers, body: JSON.stringify(payload)
      });
      setSchedules(p => p.map(s => s.id === entry.id ? entry : s));
    } else {
      const res = await fetch(`${API_BASE}/schedules`, {
        method: "POST", headers, body: JSON.stringify(payload)
      });
      const savedData = await res.json();
      setSchedules(p => [...p, { ...entry, id: savedData.id }]);
    }

    setScanned(false);
    closeModal();
  } catch (error) {
    console.error("Save failed:", error);
    alert("Failed to save schedule to database.");
  }
};

const handleDelete = async () => {
  if (!selected) return;
  try {
    const token = localStorage.getItem("token");
    await fetch(`${API_BASE}/schedules/${selected.id}`, {
      method: "DELETE",
      headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) }
    });
    setSchedules(p => p.filter(s => s.id !== selected.id));
    setScanned(false);
    closeModal();
  } catch (error) {
    console.error("Delete failed:", error);
    alert("Failed to delete schedule from database.");
  }
};

  const handleApplyFix = (fix: Conflict["fix"]) => {
    if (!fix) return;
    setSchedules(p => p.map(s => s.id === fix.scheduleId ? { ...s, [fix.field]: fix.value } : s));
    setConflicts(p => p.map(c => c.fix?.scheduleId === fix.scheduleId ? { ...c, applied: true } : c));
    setScanned(false);
  };

  // One-click transfer: reassign all listed schedule entries to the target faculty
  const handleApplyTransfers = (transfers: ConflictTransfer[]) => {
    if (!transfers.length) return;
    const transferredIds = new Set(transfers.map(t => t.scheduleId));
    setSchedules(prev =>
      prev.map(s => {
        const t = transfers.find(tr => tr.scheduleId === s.id);
        return t ? { ...s, faculty_id: t.toFacultyId } : s;
      })
    );
    setConflicts(prev => prev.map(c => {
      const remaining = c.transfers.filter(t => !transferredIds.has(t.scheduleId));
      return remaining.length === c.transfers.length ? c : { ...c, transfers: remaining, applied: remaining.length === 0 };
    }));
    setScanned(false);
  };

  const handleFinalize = () => {
    setSchedules(p=>p.map(s=>({ ...s, status:"finalized" as ScheduleStatus })));
    setScanned(false);
    closeModal();
  };



  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // 1. Fetch academic periods and find matching period_id
      const periodsRes = await api.get("/academic-periods");
      const periodsArray = Array.isArray(periodsRes.data) ? periodsRes.data : periodsRes.data?.data ?? [];

      const expectedSem = activeSem.sem === 1 ? "1st Semester" : "2nd Semester";

      let matchingPeriod = periodsArray.find((p: any) =>
        p.academicYear === activeSem.schoolYear && p.semester === expectedSem
      );

      if (!matchingPeriod) {
        console.log(`[DEBUG] Creating period: ${activeSem.schoolYear} ${expectedSem}`);
        try {
          const createRes = await api.post("/academic-periods", {
            academic_year: activeSem.schoolYear,
            semester:      expectedSem,
            is_current:    false,
          });
          matchingPeriod = createRes.data;
        } catch (createErr: any) {
          console.warn("[DEBUG] Period may already exist, re-fetching...");
          const retryRes = await api.get("/academic-periods");
          const retryList = Array.isArray(retryRes.data) ? retryRes.data : retryRes.data?.data ?? [];
          matchingPeriod = retryList.find((p: any) =>
            p.academicYear === activeSem.schoolYear && p.semester === expectedSem
          );
          if (!matchingPeriod) {
            console.error("Failed to create academic period:", createErr);
            alert(`Failed to create academic period for ${activeSem.schoolYear} ${expectedSem}.`);
            setGenerating(false);
            return;
          }
        }
      }

      const periodId = matchingPeriod.period_id ?? matchingPeriod.id;
      console.log(`[DEBUG] Using period_id: ${periodId}`);

      // 2. Generate schedule  ← THIS WAS MISSING
      const result = await generateSchedule({ sem: activeSem.sem });

      // 3. Filter out invalid entries
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validEntries = result.schedule.filter((entry: any) => {
        const isValid =
          entry.faculty_id && uuidRegex.test(entry.faculty_id) &&
          entry.subject_id && entry.subject_id !== "TBD" &&
          entry.room_id    && entry.room_id    !== "TBD" &&
          entry.day        && entry.day        !== "TBD";
        if (!isValid) console.warn("[DEBUG] Skipping invalid entry:", entry);
        return isValid;
      });

      console.log(`[DEBUG] ${result.schedule.length} total, ${validEntries.length} valid entries to save`);

      // 4. Save to database (periodId already obtained at line 1698)
          const savePromises = validEntries.map((entry: any, idx: number) => {
        const payload = {
          id:               `gen-${Date.now()}-${idx}`,
          faculty_id:       entry.faculty_id,
          subject_id:       entry.subject_id,
          room_id:          entry.room_id,
          day:              entry.day,
          start_time:       entry.start_time,
          end_time:         entry.end_time,
          section:          entry.section,
          status:           "draft" as const,
          session_group_id: entry.session_group_id ?? null,
          session_hours:    entry.session_hours ?? null,
        };
        console.log("[DEBUG] Saving:", JSON.stringify(payload));
        return api.post("/schedules", payload);
      });

      await Promise.all(savePromises);
      // 5. Refresh local state
      const refreshRes = await api.get("/schedules");
      const freshData = refreshRes.data;
      setSchedules(Array.isArray(freshData) ? freshData : freshData.data || []);

      setScanned(false);
      setLastReasoning({
        perProgram:     result.perProgramReasoning,
        utilization:    result.facultyUtilization,
        missingEntries: result.missingEntries,
        wasFixed:       result.wasFixed,
        apiCalls:       result.apiCallsUsed,
        sem:            activeSem.sem,
        schoolYear:     activeSem.schoolYear,
      });

      setModal("reasoning");
    } catch (err) {
      console.error("Persistence failed:", err);
      alert("Schedule generation failed. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };
  // ✏️ EDIT — replace the setTimeout with your actual Supabase + Gemini API call

// REPLACE WITH:
  const runScan = async () => {
    setScanning(true);
    setScanned(false);

    // Step 1 — Local scan is instant (~5ms). Show results immediately.
    const localConflicts = runConflictScan(schedules);
    setConflicts(localConflicts);
    setScanning(false);
    setScanned(true);
    setModal("scan");          // ← Modal opens NOW with local suggestions

    // Step 2 — Enrich in the background. Modal is already open.
    // When Gemini responds, suggestions update in place silently.
    if (localConflicts.length === 0) return;

    try {
      const context = buildGeminiContext(schedules, localConflicts);
      const geminiSuggestions = await enrichConflictsWithGemini(context);
      if (geminiSuggestions.length > 0) {
        setConflicts(prev =>
          prev.map(conflict => {
            const match = geminiSuggestions.find(g => g.conflictId === conflict.id);
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
        );
      }
    } catch (err) {
      // Enrichment failed — local suggestions already showing, nothing breaks
      console.error("[DeptFlow] Gemini enrichment failed, local suggestions retained:", err);
    }
  };
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
    <div className="p-8 space-y-6 font-lexend">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Manage Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">
            Draft all assignments freely — then run one AI scan to detect and fix all conflicts at once.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">

          {/* ── Semester context selector (FIX 5) ── */}
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5">
            <CalendarDays size={14} className="text-indigo-500 shrink-0"/>
            <span className="text-xs font-semibold text-indigo-700 shrink-0">Generating for:</span>
            <select
              className="text-xs font-bold text-indigo-800 bg-transparent border-none outline-none cursor-pointer"
              value={activeSem.schoolYear}
              onChange={e => setActiveSem(p => ({ ...p, schoolYear: e.target.value }))}
            >
              {["2023-2024","2024-2025","2025-2026"].map(sy=>(
                <option key={sy} value={sy}>{sy}</option>
              ))}
            </select>
            <span className="text-indigo-400">·</span>
            <select
              className="text-xs font-bold text-indigo-800 bg-transparent border-none outline-none cursor-pointer"
              value={activeSem.sem}
              onChange={e => setActiveSem(p => ({ ...p, sem: Number(e.target.value) as 1|2 }))}
            >
              <option value={1}>1st Semester</option>
              <option value={2}>2nd Semester</option>
            </select>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-2">
            {/* FIX 4: View Reasoning button — only shown when a result exists */}
            {lastReasoning && (
              <button
                onClick={() => setModal("reasoning")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <Info size={15}/> View Reasoning
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating || scanning}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                ${generating || scanning
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"}`}
            >
              <Sparkles size={15}/>
              {generating ? "Generating..." : "Generate Schedule"}
            </button>
            <button
              onClick={runScan}
              disabled={scanning || generating}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                ${scanning ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"}`}
            >
              <Sparkles size={15}/>
              {scanning ? "Scanning..." : "Run AI Conflict Scan"}
            </button>
            <button
              onClick={() => setModal("add")}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-colors"
            >
              <Plus size={15}/> Add Assignment
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ScheduleStatCard label="TOTAL ASSIGNMENTS" value={schedules.length} icon={<BookOpen size={22}/>} sub="This semester"/>
        <ScheduleStatCard label="FINALIZED"         value={finalized}        icon={<ShieldCheck size={22}/>} sub="Published to faculty"/>
        <ScheduleStatCard label="DRAFT"             value={drafts}           icon={<Clock size={22}/>}   sub="Pending conflict scan"/>
        <ScheduleStatCard label="FACULTY ASSIGNED"  value={FACULTY_LIST.length} icon={<Users size={22}/>} sub="Active this semester"/>
      </div>

      {/* ── Draft Scan Banner ── */}
      {drafts > 0 && !scanned && (
        <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <Sparkles size={18} className="text-violet-600 shrink-0"/>
          <div className="flex-1">
            <p className="text-sm font-bold text-violet-800">
              {drafts} draft assignment{drafts!==1?"s":""} pending conflict check
            </p>
            <p className="text-xs text-violet-600 mt-0.5">
              Finish drafting all schedules, then click <strong>Run AI Conflict Scan</strong> to detect and resolve all conflicts at once.
            </p>
          </div>
          <button onClick={runScan} disabled={scanning}
            className="shrink-0 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-colors">
            {scanning ? "Scanning..." : "Scan Now"}
          </button>
        </div>
      )}

      {/* ── All Finalized Banner ── */}
      {scanned && finalized === schedules.length && schedules.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 size={18} className="text-green-600 shrink-0"/>
          <p className="text-sm font-bold text-green-800">All schedules are finalized and published to faculty dashboards.</p>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-6 items-start">

        {/* LEFT — Schedule list / views */}
        <div className="space-y-4">

          {/* Toolbar */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            {/* Search + View toggle */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input
                  className={`${inputCls} pl-9`}
                  placeholder="Search faculty, subject code, or section..."
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                />
              </div>
              {/* View toggle buttons */}
              <div className="flex gap-1.5">
                {([["card","Card",LayoutGrid],["timetable","Timetable",TableProperties]] as const).map(([id,label,Icon])=>(
                  <button key={id} onClick={()=>setView(id as ViewMode)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors
                      ${view===id ? "bg-primary border-primary text-white" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                    <Icon size={13}/>{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter chips — FIX 5 (program filter) + FIX 6 (room filter) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Day */}
              <div className="flex items-center gap-2 flex-1 min-w-[130px]">
                <span className="text-xs text-gray-400 shrink-0">Day:</span>
                <select className={inputCls} value={filterDay} onChange={e=>setFilterDay(e.target.value)}>
                  <option value="All">All Days</option>
                  {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {/* Faculty */}
              <div className="flex items-center gap-2 flex-1 min-w-[170px]">
                <span className="text-xs text-gray-400 shrink-0">Faculty:</span>
                <select className={inputCls} value={filterFac} onChange={e=>setFilterFac(e.target.value)}>
                  <option value="All">All Faculty</option>
                  {FACULTY_LIST.map(f=>(
                    <option key={f.id} value={f.id}>{getFacultyName(f as ReturnType<typeof getFaculty>)}</option>
                  ))}
                </select>
              </div>
              {/* Program — FIX 5 */}
              <div className="flex items-center gap-2 flex-1 min-w-[130px]">
                <span className="text-xs text-gray-400 shrink-0">Program:</span>
                <select className={inputCls} value={filterProgram} onChange={e=>setFilterProgram(e.target.value)}>
                  <option value="All">All Programs</option>
                  <option value="BSCS">BSCS</option>
                  <option value="BSIT">BSIT</option>
                  <option value="BSIS">BSIS</option>
                </select>
              </div>
              {/* Room — FIX 6 */}
              <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                <span className="text-xs text-gray-400 shrink-0">
                  <DoorOpen size={13} className="inline mr-1 text-gray-400"/>Room:
                </span>
                <select className={inputCls} value={filterRoom} onChange={e=>setFilterRoom(e.target.value)}>
                  <option value="All">All Rooms</option>
                  {ROOM_LIST.map(r=>(
                    <option key={r.id} value={r.id}>{(r as any).room}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-xs text-gray-500 px-1">
            Showing <span className="font-bold text-gray-800">{filtered.length}</span> of {schedules.length} assignments
          </p>

          {/* View content */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center text-gray-400">
              <CalendarDays size={36} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">No assignments found.</p>
            </div>
          ) : (
            <>
              {view === "card"       && <CardView      data={filtered} onEdit={openEdit} onDelete={openDelete}/>}
              {view === "timetable"  && <TimetableView data={filtered} onEdit={openEdit} onDelete={openDelete}/>}
            </>
          )}
        </div>

        {/* RIGHT — Load monitor */}
        <LoadMonitorPanel sched={schedules}/>
      </div>

      {/* ── Modals ── */}
      {(modal==="add"||modal==="edit") && (
        <ScheduleFormModal editing={modal==="edit"?selected:null} onSave={handleSave} onClose={closeModal}/>
      )}
      {modal==="delete" && selected && (
        <DeleteModal schedule={selected} onConfirm={handleDelete} onClose={closeModal}/>
      )}
      {modal==="scan" && (
        <ConflictScanModal
          initialConflicts={conflicts}
          onApplyFix={handleApplyFix}
          onApplyTransfers={handleApplyTransfers}
          onClose={closeModal}
          onFinalize={handleFinalize}
        />
      )}
      {/* FIX 4: Reasoning modal — reopenable any time via "View Reasoning" button */}
      {modal==="reasoning" && lastReasoning && (
        <ReasoningModal data={lastReasoning} onClose={closeModal}/>
      )}
    </div>
    </AdminLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 4: REASONING MODAL
// Shows per-program Gemini reasoning + full faculty utilization table.
// Opened automatically after generation and re-openable via "View Reasoning".
// ─────────────────────────────────────────────────────────────────────────────

function ReasoningModal({ data, onClose }: {
  data: {
    perProgram: Record<string, string>;
    utilization: FacultyUtilization[];
    missingEntries: MissingEntry[];
    wasFixed: boolean;
    apiCalls: number;
    sem: 1 | 2;
    schoolYear: string;
  };
  onClose: () => void;
}) {
  const semLabel = data.sem === 1 ? "1st Semester" : "2nd Semester";
  const programs = ["BSCS", "BSIT", "BSIS"];

  return (
    <Modal title="AI Scheduling Reasoning" onClose={onClose} maxWidth="max-w-3xl">
      {/* Context pill */}
      <div className="flex items-center gap-2 mb-5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
        <CalendarDays size={15} className="text-indigo-500 shrink-0"/>
        <span className="text-xs font-semibold text-indigo-700">
          {data.schoolYear} · {semLabel}
        </span>
        <span className="ml-auto text-xs text-indigo-500">
          {data.apiCalls} API call{data.apiCalls!==1?"s":""} · {data.wasFixed ? "Generated + fixed" : "Generated clean"}
        </span>
      </div>

      {/* Per-program reasoning */}
      <div className="space-y-3 mb-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Reasoning per Program</p>
        {programs.map(prog => {
          const text = data.perProgram[prog];
          if (!text) return null;
          return (
            <div key={prog} className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <p className="text-xs font-bold text-gray-700 mb-1">{prog}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
            </div>
          );
        })}
      </div>

      {/* Curriculum completeness panel — shown prominently when entries are missing */}
      {data.missingEntries.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-600 shrink-0"/>
            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">
              Incomplete Schedule — {data.missingEntries.length} subject{data.missingEntries.length !== 1 ? "s" : ""} missing
            </p>
          </div>
          <p className="text-xs text-red-600 mb-3 leading-relaxed">
            The following subjects are required by the curriculum but have no schedule entry.
            Run <strong>Generate Schedule</strong> again or add them manually.
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {data.missingEntries.map((m, i) => (
              <div key={i} className="flex items-center gap-3 bg-white border border-red-100 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold text-red-400 w-12 shrink-0">{m.program}</span>
                <span className="text-xs font-bold text-red-800">{m.subjectCode}</span>
                <span className="text-[11px] text-red-500 ml-auto">{m.section}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.missingEntries.length === 0 && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 size={14} className="text-green-600 shrink-0"/>
          <p className="text-xs font-semibold text-green-700">All curriculum subjects have schedule entries ✓</p>
        </div>
      )}

      {/* Faculty utilization table */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Faculty Utilization</p>
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Faculty</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Type</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Units</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Load</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Subjects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.utilization.map(u => {
                const fData = FACULTY_LIST.find(f => f.id === u.facultyId);
                const empType = fData?.personal.employmentType ?? "";
                const barColor = u.utilization >= 90 ? "bg-red-400"
                               : u.utilization >= 70 ? "bg-amber-400"
                               : u.utilization >= 30 ? "bg-green-400"
                               : "bg-gray-200";
                return (
                  <tr key={u.facultyId} className={u.assignedUnits === 0 ? "bg-gray-50 opacity-60" : "bg-white"}>
                    <td className="px-3 py-2 font-semibold text-gray-800">{u.name}</td>
                    <td className="px-3 py-2 text-gray-500">{empType}</td>
                    <td className="px-3 py-2 text-gray-700">{u.assignedUnits}/{u.maxUnits}u</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full`} style={{width:`${Math.min(u.utilization,100)}%`}}/>
                        </div>
                        <span className="text-gray-500">{u.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-500 max-w-[200px]">
                      {u.assignedUnits === 0 && u.notUsedReason
                        ? <span className="italic text-amber-600">{u.notUsedReason}</span>
                        : u.subjects.join(", ") || "—"
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
