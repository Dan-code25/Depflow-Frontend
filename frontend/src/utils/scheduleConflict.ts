import { type ScheduleAssignment } from "./geminiSchedHelper";
import { type GeminiScheduleContext } from "./geminiSchedule";
// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ScheduleStatus = "draft" | "finalized" | "published";
export type ConflictType   = "HARD" | "SOFT";

export interface ConflictFix {
  scheduleId: string;
  field: keyof ScheduleAssignment;
  value: string;
}

// A transfer moves one or more schedule entries to a different faculty member.
// Used for overload resolution so the admin can click once to reassign.
export interface ConflictTransfer {
  scheduleId:    string;  // which entry to move
  subjectCode:   string;  // human label for the button
  units:         number;  // subject unit value for display
  toFacultyId:   string;  // destination faculty
  toFacultyName: string;
}

// Alias so new code from previous session compiles without changes
export type OverloadTransfer = ConflictTransfer;

export interface Conflict {
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

// ─────────────────────────────────────────────────────────────────────────────
// GLOBALS & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export let FACULTY_LIST: any[] = [];
export let SUBJECT_LIST: any[] = [];
export let ROOM_LIST: any[] = [];

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const HOURS_PER_UNIT = 1;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getEffectiveFacId = (s: ScheduleAssignment) => s.faculty_id || s.other_faculty_id;
const getEffectiveRoomId = (s: ScheduleAssignment) => s.room_id || s.other_room_id;

export const getAvatarColor = (f: ReturnType<typeof getFaculty>): string => 
  (f && 'avatarColor' in f && typeof f.avatarColor === 'string' && f.avatarColor) ? f.avatarColor : "bg-gray-400";

export const getFaculty = (id: string) => FACULTY_LIST.find(f => f.id === id);
export const getSubject = (id: string) => SUBJECT_LIST.find(s => s.id === id);
export const getRoom    = (id: string) => ROOM_LIST.find(r => r.id === id);
export const getFacultyInitials = (f: ReturnType<typeof getFaculty>) => f ? `${f.personal.firstName.charAt(0)}${f.personal.lastName.charAt(0)}`.toUpperCase() : "";
export const getFacultyName = (f: ReturnType<typeof getFaculty>) => f ? `${f.personal.firstName} ${f.personal.lastName}` : "Unknown Faculty";
export const toMins = (t: string | undefined | null): number => {
  if (!t || typeof t !== "string" || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
};
export const overlaps = (aS: string, aE: string, bS: string, bE: string): boolean =>
  toMins(aS) < toMins(bE) && toMins(aE) > toMins(bS);

// getTotalUnits — counts academic units using subject.units (the credit value),
// NOT clock hours. This matches how TUP/CHED defines faculty load: a 3-unit
// subject is 3 units of load regardless of whether it meets for 1 hr or 3 hrs.
// Split sessions (same session_group_id) are counted only ONCE.
export const getTotalUnits = (sched: ScheduleAssignment[], fid: string): number => {
  const mine = sched.filter(s => (s.faculty_id === fid || s.other_faculty_id === fid) && s.day !== "TBD");
  
  const deduped = mine.filter((s, _, arr) => {
    if (!s.session_group_id) return true;
    return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
  });
  return deduped.reduce((n, s) => n + (getSubject(s.subject_id)?.units ?? 0), 0);
};

// getFacultyMaxUnits — derived from employment type, NOT f.max_units.
// f.max_units is often absent; employment type is always set.
// Matches the cap logic in geminiSchedHelper.ts exactly.
export const getFacultyMaxUnits = (f: ReturnType<typeof getFaculty>): number => {
  if (!f) return 21;
  const emp = (f as any).personal?.employmentType ?? "";
  return emp === "Part-Time" ? 12 : 21;
};

export const getDurationHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  return (toMins(end) - toMins(start)) / 60;
};

export const isHourUnitMatch = (start: string, end: string, units: number, facilityType?: string): boolean => {
  // Lab exception: 1 unit lab = 2 clock hours
  const expectedHours = (facilityType === "lab") ? units * 2 : units * HOURS_PER_UNIT;
  return getDurationHours(start, end) === expectedHours;
};

export function buildGeminiContext(
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
      specializations: f.preferences?.subjectSpecializations || []
    })),
 
    subjects: SUBJECT_LIST.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      units: s.units,
      facilityType: (s as any).facilityType ?? "lecture",
    })),
 
    schedules: sched.map((s) => {
  const fId = getEffectiveFacId(s);
  const f = fId ? getFaculty(fId) : null;
  const sub = getSubject(s.subject_id);
  const rId = getEffectiveRoomId(s);
  const room = rId ? getRoom(rId) : null;

  return {
    id: s.schedule_id,
    // If it's a guest, the name lookup in FACULTY_LIST might fail 
    // depending on how you sync guest names to that list.
    facultyName: f ? getFacultyName(f) : "Guest/TBA", 
    subjectCode: sub?.code ?? s.subject_id,
    subjectName: sub?.name ?? "",
    section: s.section,
    room: room?.room ?? "Guest Room",
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
      affected: c.affected,
      message: c.message,
    })),
  };
}
export const isExternalSubject = (subjectId: string): boolean => {
  const code = subjectId.toUpperCase();
  return (
    code.startsWith("GE") || 
    code.startsWith("MATH") || 
    code.startsWith("PE") || 
    code.includes("NSTP") ||
    ["CS403-M", "IS406-M", "IT406-M"].includes(code) // OJT Codes
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export function runConflictScan(sched: ScheduleAssignment[]): Conflict[] {
  const results: Conflict[] = [];
  const seen = new Set<string>();

 sched.forEach(s => {
    // Skip external subjects (Shield)
    if (isExternalSubject(s.subject_id)) return;

    // 1. Needs Faculty Assignment
    if (!s.faculty_id || s.faculty_id === "TBD") {
      results.push({
        id: `tbd-fac-${s.schedule_id}`,
        type: "SOFT",
        label: "Needs Faculty",
        affected: [s.schedule_id],
        message: `${getSubject(s.subject_id)?.code} (${s.section}) has no faculty assigned.`,
        // 🚩 ADD THESE MISSING PROPERTIES:
        suggestion: "Open the Edit modal to assign a faculty member.",
        fix: null,
        transfers: [],
        dismissed: false,
        applied: false,
      });
    }

    // 2. Needs Time Assignment
    if (!s.day || s.day === "TBD") {
      results.push({
        id: `tbd-time-${s.schedule_id}`,
        type: "SOFT",
        label: "Needs Time",
        affected: [s.schedule_id],
        message: `${getSubject(s.subject_id)?.code} for section ${s.section} has no scheduled day or time.`,
        // 🚩 ADD THESE MISSING PROPERTIES:
        suggestion: "Assign a specific day and time range to this subject.",
        fix: null,
        transfers: [],
        dismissed: false,
        applied: false,
      });
    }
  });
  
  // ── Pass 0: "Needs Faculty" soft warning for every TBD entry ────────────────
  // GE/MATH subjects are generated with faculty_id="TBD" intentionally.
  // Flagged as SOFT (not HARD) so they don't block finalization — they're
  // expected to be resolved manually by the admin.
   const findAvailableRoom = (day: string, startTime: string, endTime: string, excludeRooms: string[]) => {
    return ROOM_LIST.find(room => {
      // Skip excluded rooms
      if (excludeRooms.includes(room.id)) return false;
      
      // Check if this room is free at this time
      const isBooked = sched.some(s => 
        s.room_id === room.id && 
        s.day === day && 
        overlaps(s.start_time, s.end_time, startTime, endTime)
      );
      
      return !isBooked;  // Return room only if NOT booked
    });
  };
  
  const findAvailableDay = (facultyId: string, startTime: string, endTime: string) => {
    const daysToTry = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    return daysToTry.find(day => {
      // Check if faculty is free on this day at this time
      const isBooked = sched.some(s =>
        s.faculty_id === facultyId &&
        s.day === day &&
        overlaps(s.start_time, s.end_time, startTime, endTime)
      );
      
      return !isBooked;  // Return day only if NOT booked
    });
  };
  sched.forEach(s => {
    if (s.faculty_id === "TBD") {
      const sub = getSubject(s.subject_id);
      results.push({
        id: `tbd-fac-${s.schedule_id}`,
        type: "SOFT",
        label: "Needs Faculty Assignment",
        affected: [s.schedule_id],
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
        id: `tbd-time-${s.schedule_id}`,
        type: "SOFT",
        label: "Needs Time Assignment",
        affected: [s.schedule_id],
        message: `${sub?.code ?? s.subject_id} for ${getFacultyName(getFaculty(s.faculty_id ?? ""))} (${s.section}) has no day/time scheduled yet — added by minimum-load enforcement.`,
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
      const key = [a.schedule_id, b.schedule_id].sort().join("-");
      if (seen.has(key)) return;

      const facA = getEffectiveFacId(a);
      const facB = getEffectiveFacId(b);
      // Hard: time overlap — same faculty, same day, overlapping slots
      // Skip TBD entries — they have no scheduled time yet so cannot overlap
      if (facA === facB && facA !== "TBD" && a.day === b.day && a.day !== "TBD" && overlaps(a.start_time,a.end_time,b.start_time,b.end_time)) {
        seen.add(key);
        const f=getFaculty(facA ?? ""), sA=getSubject(a.subject_id), sB=getSubject(b.subject_id);
        const fixDay = findAvailableDay(b.faculty_id ?? "", b.start_time, b.end_time) || "TBD";
        results.push({ id:`time-${key}`, type:"HARD", label:"Time Overlap", affected:[a.schedule_id,b.schedule_id],
          message:`${getFacultyName(f)} is double-booked on ${a.day}: ${sA?.code} (${a.start_time}–${a.end_time}) overlaps with ${sB?.code} (${b.start_time}–${b.end_time}).`,
          suggestion:`Reschedule ${sB?.code} (${b.section}) to ${fixDay} at the same time. No other conflicts found on that day.`,
          fix:{ scheduleId:b.schedule_id, field:"day", value:fixDay }, transfers:[], dismissed:false, applied:false });
      }

      // Hard: room double-booking — same room, same day, overlapping slots
      const roomA = getEffectiveRoomId(a);
      const roomB = getEffectiveRoomId(b);

        if (roomA && roomA === roomB && roomA !== "TBD" && a.day === b.day && overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) {
        seen.add(key);
        const r=getRoom(roomA ?? ""), fA=getFaculty(facA ?? ""), fB=getFaculty(facB ?? "");
        const altRoom = findAvailableRoom(b.day, b.start_time, b.end_time, [roomA ?? "", roomB ?? ""]);
        results.push({ id:`room-${key}`, type:"HARD", label:"Room Double-Booking", affected:[a.schedule_id,b.schedule_id],
          message:`${r?.room} is double-booked on ${a.day}: assigned to both ${getFacultyName(fA)} and ${getFacultyName(fB)} at overlapping times.`,
          suggestion:`Move ${getFacultyName(fB)}'s class (${getSubject(b.subject_id)?.code}) to ${altRoom?.room ?? "another available room"}.`,
          fix:{ scheduleId:b.schedule_id, field:"room_id", value:altRoom?.id ?? b.room_id }, transfers:[], dismissed:false, applied:false });
      }
    });
  });

  // ── Pass 2: per-entry hour mismatch ───────────────────────────────────────
  sched.forEach(s => {
    const sub = getSubject(s.subject_id) as any;
    if (!sub) return;
    if (!isHourUnitMatch(s.start_time, s.end_time, sub.units, sub.facilityType)) {
      const actual   = getDurationHours(s.start_time, s.end_time);
      const isLab    = sub.facilityType === "lab";
      const expected = isLab ? sub.units * 2 : sub.units * HOURS_PER_UNIT;
      const unitRule = isLab
        ? `Lab exception: 1 unit = 2 clock hours`
        : `1 unit = ${HOURS_PER_UNIT} hr`;
      results.push({
        id: `unithr-${s.schedule_id}`,
        type: "SOFT",
        label: "Hour–Unit Mismatch",
        affected: [s.schedule_id],
        message: `${sub.code} (${sub.units} unit${sub.units !== 1 ? "s" : ""}) for section ${s.section} is scheduled for ${actual} hr${actual !== 1 ? "s" : ""} but should be ${expected} hr${expected !== 1 ? "s" : ""} (${unitRule}).`,
        suggestion: `Adjust the time slot so the class runs for exactly ${expected} hour${expected !== 1 ? "s" : ""}. Example: if start is ${s.start_time}, set end to ${(() => { const end = toMins(s.start_time) + expected * 60; return `${String(Math.floor(end/60)).padStart(2,"0")}:${String(end%60).padStart(2,"0")}`; })()}.`,
        fix: {
          scheduleId: s.schedule_id,
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
            
            // 🚨 FIX: Permissive specialization check (Matches AI Validator)
            const xPrefs = (x as any).preferences || {};
            const specs = xPrefs.subjectSpecializations || [];
            if (specs.length > 0 && !specs.includes(subId)) return false; 
            
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
          scheduleId:    entry.schedule_id,
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
        affected: myEntries.map(s => s.schedule_id),
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

  // ── Pass 4b: Lab–Lec faculty mismatch ────────────────────────────────────
  // If a section has both a Lab and a Lecture variant of the same subject,
  // they MUST be assigned to the same faculty member to count as full 3 units.
  const bySection: Record<string, ScheduleAssignment[]> = {};
  sched.forEach(s => {
    if (!bySection[s.section]) bySection[s.section] = [];
    bySection[s.section].push(s);
  });

  Object.entries(bySection).forEach(([section, entries]) => {
    const labs     = entries.filter(s => (getSubject(s.subject_id) as any)?.facilityType === "lab");
    const lectures = entries.filter(s => (getSubject(s.subject_id) as any)?.facilityType === "lecture");

    labs.forEach(lab => {
      const labSub = getSubject(lab.subject_id);
      if (!labSub) return;
      const labBase = labSub.code
        .replace(/\s*(lab|laboratory)\s*$/i, "")
        .replace(/\s*(lec|lecture)\s*$/i, "")
        .trim().toUpperCase();

      lectures.forEach(lec => {
        const lecSub = getSubject(lec.subject_id);
        if (!lecSub) return;
        const lecBase = lecSub.code
          .replace(/\s*(lab|laboratory)\s*$/i, "")
          .replace(/\s*(lec|lecture)\s*$/i, "")
          .trim().toUpperCase();

        if (labBase !== lecBase) return;
        if (lab.faculty_id === lec.faculty_id) return;
        if (lab.faculty_id === "TBD" || lec.faculty_id === "TBD") return;

        const pairKey = [lab.schedule_id, lec.schedule_id].sort().join("-");
        if (seen.has(pairKey)) return;
        seen.add(pairKey);

        const labFacName = getFacultyName(getFaculty(lab.faculty_id ?? ""));
        const lecFacName = getFacultyName(getFaculty(lec.faculty_id ?? ""));
        results.push({
          id:        `lablec-${pairKey}`,
          type:      "HARD",
          label:     "Lab–Lec Faculty Mismatch",
          affected:  [lab.schedule_id, lec.schedule_id],
          message:   `${labSub.code} (Lab) and ${lecSub.code} (Lec) for ${section} are assigned to different faculty: ` +
                     `${labFacName} (Lab) vs ${lecFacName} (Lec). Both must go to the same professor for the full 3-unit credit.`,
          suggestion: `Reassign the Lecture section to ${labFacName} (who has the Lab) or vice versa, ` +
                      `whichever faculty has more remaining unit capacity.`,
          fix:       { scheduleId: lec.schedule_id, field: "faculty_id", value: lab.faculty_id ?? "" },
          transfers: [],
          dismissed: false,
          applied:   false,
        });
      });
    });
  });

  // ── Pass 4c: NSTP must be on Sunday ──────────────────────────────────────
  sched.forEach(s => {
    const sub = getSubject(s.subject_id);
    if (!sub || !sub.code.toUpperCase().includes("NSTP")) return;
    if (s.day === "Sunday" || s.day === "TBD") return;
    results.push({
      id:        `nstp-day-${s.schedule_id}`,
      type:      "HARD",
      label:     "NSTP Must Be Sunday",
      affected:  [s.schedule_id],
      message:   `${sub.code} (${s.section}) is scheduled on ${s.day}. NSTP must always be scheduled on Sunday per curriculum policy.`,
      suggestion: `Move this entry to Sunday at the same time slot.`,
      fix:       { scheduleId: s.schedule_id, field: "day", value: "Sunday" },
      transfers: [],
      dismissed: false,
      applied:   false,
    });
  });

  // ── Pass 4d: Lab subjects need 2 clock hours (exception to 1u = 1hr rule) ─
  sched.forEach(s => {
    if (s.day === "TBD" || !s.start_time || !s.end_time || s.start_time === "TBD") return;
    const sub = getSubject(s.subject_id) as any;
    if (!sub || sub.facilityType !== "lab") return;
    const clockHours = getDurationHours(s.start_time, s.end_time);
    if (clockHours >= 2) return; // already correct
    const endMins = toMins(s.start_time) + 120;
    const fixedEnd = `${String(Math.floor(endMins / 60)).padStart(2,"0")}:${String(endMins % 60).padStart(2,"0")}`;
    results.push({
      id:        `labhr-${s.schedule_id}`,
      type:      "HARD",
      label:     "Lab Requires 2 Clock Hours",
      affected:  [s.schedule_id],
      message:   `${sub.code} (${s.section}) is a lab subject (1 unit = 2 clock hrs) but is only scheduled for ${clockHours} hr${clockHours !== 1 ? "s" : ""}. Labs always need 2 hours of actual teaching time even though they're 1 credit unit.`,
      suggestion: `Extend the end time from ${s.end_time} to ${fixedEnd} (2 hours from start). Alternatively, split into two 1-hour sessions on different days.`,
      fix:       { scheduleId: s.schedule_id, field: "end_time", value: fixedEnd },
      transfers: [],
      dismissed: false,
      applied:   false,
    });
  });

  // ── Pass 5: preferred-time soft warnings ─────────────────────────────────  // Check every confirmed assignment against the faculty's preferred time range.
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
      const name = getFacultyName(getFaculty(s.faculty_id ?? ""));
      preferredTimeWarnings.push({
        id: `preftime-${s.schedule_id}`,
        type: "SOFT",
        label: "Outside Preferred Time",
        affected: [s.schedule_id],
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

export const categorizeByFixability = (c: Conflict): "AUTO" | "SEMI_AUTO" | "NEEDS_AI" | "FILTERED_OUT" => {
  // AUTO: Can be fixed with one deterministic action
  if (c.id.startsWith("labhr-")) return "AUTO";
  if (c.id.startsWith("nstp-day-")) return "AUTO";
  if (c.id.startsWith("lablec-")) return "AUTO";

  if (c.id.startsWith("room-") && c.type === "HARD" && c.fix) return "AUTO";   
  if (c.id.startsWith("time-") && c.type === "HARD" && c.fix) return "AUTO";   
  
  // NEEDS_AI: ONLY overload conflicts that need reassignments
  if (c.id.startsWith("overload-") && c.type === "HARD") return "NEEDS_AI";
  
  // SEMI_AUTO: Show dropdown of 2-3 pre-validated options
  if (c.id.startsWith("overload-") && (c.transfers?.length || c.fix)) return "SEMI_AUTO"; 
  if (c.id.startsWith("tbd-fac-")) return "SEMI_AUTO"; 
  
  // Everything else (room/time conflicts) → DON'T show, frontend handles them
  return "FILTERED_OUT";
};

export function resolveConflictsDeterministically(
  currentSchedules: ScheduleAssignment[]
): { fixedSchedules: ScheduleAssignment[]; unresolvableCount: number } {
  const safeSchedules: ScheduleAssignment[] = [];
  let conflictedSchedules: ScheduleAssignment[] = [];
  const seenSlots = new Set<string>();

  const TIME_BLOCKS = Array.from({ length: 13 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

  // 1. Separate safe entries and track their "claims" on time/room slots
  currentSchedules.forEach((sched) => {
    if (sched.day === "TBD" || sched.start_time === "TBD" || !sched.day) {
      conflictedSchedules.push(sched);
      return;
    }

    const startHour = parseInt(sched.start_time.split(":")[0]);
    const duration = (toMins(sched.end_time) - toMins(sched.start_time)) / 60;
    const isExt = isExternalSubject(sched.subject_id);
    let hasConflict = false;

    for (let i = 0; i < duration; i++) {
      const h = startHour + i;
      if (seenSlots.has(`${sched.day}-F-${sched.faculty_id}-${h}`) || 
          seenSlots.has(`${sched.day}-S-${sched.section}-${h}`) ||
          (!isExt && sched.room_id && seenSlots.has(`${sched.day}-R-${sched.room_id}-${h}`))) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) {
      conflictedSchedules.push(sched);
    } else {
      safeSchedules.push(sched);
      for (let i = 0; i < duration; i++) {
        const h = startHour + i;
        seenSlots.add(`${sched.day}-F-${sched.faculty_id}-${h}`);
        seenSlots.add(`${sched.day}-S-${sched.section}-${h}`);
        if (!isExt && sched.room_id !== "TBD") seenSlots.add(`${sched.day}-R-${sched.room_id}-${h}`);
      }
    }
  });

  // 2. Fix conflicted entries by hunting for available "Shielded" slots
  let unresolvableCount = 0;
  conflictedSchedules.forEach((conflict) => {
    const subject = getSubject(conflict.subject_id) as any;
    if (!subject) return;

    const isExternal = isExternalSubject(conflict.subject_id);
    const requiredHours = (subject.facilityType === "lab") ? subject.units * 2 : subject.units;
    const prof = getFaculty(conflict.faculty_id ?? "")
    let placed = false;

    // SHIELD: External subjects only check for Time, not physical Rooms
    const roomsToTry = isExternal ? [{ id: null, room: "TBD" }] : ROOM_LIST.filter(r => r.type === (subject.facilityType || "lecture"));

    for (const room of roomsToTry) {
      if (placed) break;
      for (const day of DAYS) {
        if (placed) break;
        if (prof?.preferences?.unavailableDays?.includes(day)) continue;
        if (day === "Sunday" && !subject.code.toUpperCase().includes("NSTP")) continue;
        if (day !== "Sunday" && subject.code.toUpperCase().includes("NSTP")) continue;

        for (let i = 0; i <= TIME_BLOCKS.length - requiredHours; i++) {
          const startHour = parseInt(TIME_BLOCKS[i].split(":")[0]);
          let canFit = true;

          for (let h = 0; h < requiredHours; h++) {
            const currH = startHour + h;
            const isBlocked = prof?.preferences?.unavailableTimeSlots?.some((slot: string) => overlaps(TIME_BLOCKS[i], `${startHour+requiredHours}:00`, slot.split("-")[0], slot.split("-")[1]));
            if (isBlocked || seenSlots.has(`${day}-F-${conflict.faculty_id}-${currH}`) || 
                seenSlots.has(`${day}-S-${conflict.section}-${currH}`) ||
                (!isExternal && room.id && seenSlots.has(`${day}-R-${room.id}-${currH}`))) {
              canFit = false; break;
            }
          }

          if (canFit) {
            conflict.room_id = isExternal ? null : room.id;
            conflict.day = day;
            conflict.start_time = `${String(startHour).padStart(2, "0")}:00`;
            conflict.end_time = `${String(startHour + requiredHours).padStart(2, "0")}:00`;
            safeSchedules.push(conflict);
            placed = true;
            for (let h = 0; h < requiredHours; h++) {
              seenSlots.add(`${day}-F-${conflict.faculty_id}-${startHour + h}`);
              seenSlots.add(`${day}-S-${conflict.section}-${startHour + h}`);
              if (!isExternal) seenSlots.add(`${day}-R-${room.id}-${startHour + h}`);
            }
            break;
          }
        }
      }
    }
    if (!placed) { unresolvableCount++; safeSchedules.push(conflict); }
  });

  return { fixedSchedules: safeSchedules, unresolvableCount };
}