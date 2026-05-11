// ─────────────────────────────────────────────────────────────────────────────
// src/utils/geminiSchedHelper.ts
//
// Hybrid AI Scheduling Engine — DeptFlow (Extended)
//
// FEATURES:
//   ✓ Faculty subject specializations (only assign what they can teach)
//   ✓ Day unavailability & day preferences
//   ✓ Time range availability & blocked time slots
//   ✓ Facility type matching (lab vs lecture room)
//   ✓ Faculty priority (high-priority faculty get first pick of preferred slots)
//   ✓ Max classes per day & max consecutive hours per faculty
//   ✓ Split sessions (1 subject across 2 days, e.g. 1hr Mon + 2hr Thu)
//   ✓ Room capacity awareness
//   ✓ Full local conflict/constraint validation (free, no API cost)
//   ✓ Hybrid flow: generate → validate → fix if needed (max 2 API calls)
// ─────────────────────────────────────────────────────────────────────────────
import api from "../services/api"; 
import { toMins, overlaps, DAYS, getSubject} from "./scheduleConflict";

let FACULTY_LIST: any[] = [];
let SUBJECT_LIST: any[] = [];
let ROOM_LIST: any[] = [];
let CURRICULUM: any[] = [];
let OTHER_FACULTY_LIST: any[] = []; // NEW
let OTHER_ROOM_LIST: any[] = [];

 
// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
 
export interface ScheduleAssignment {
  schedule_id: string;
  faculty_id: string | null;
  other_faculty_id?: string | null;      // ← ADD THIS
  subject_id: string;
  room_id: string | null;
  other_room_id?: string | null;         // ← ADD THIS
  day: string;
  start_time: string;
  end_time: string;
  section: string;
  status: "draft" | "finalized" | "published";
  session_group_id?: string | null;
  session_hours?: number | null;
  school_year?: number | null; // 🚩 ADD THIS
  semester?: number | null;    // 🚩 ADD THIS
}
 
export interface FacultyUtilization {
  facultyId:     string;
  name:          string;
  assignedUnits: number;
  maxUnits:      number;
  utilization:   number;    // 0-100 percent
  subjects:      string[];  // subject codes assigned
  notUsedReason?: string;   // populated when assignedUnits === 0
}

export interface GenerationResult {
  schedule:             ScheduleAssignment[];
  reasoning:            string;
  facultyUtilization:   FacultyUtilization[];
  missingEntries:       MissingEntry[]; 
}
 
export interface ValidationIssue {
  id:      string;
  type:    "HARD" | "SOFT";
  label:   string;
  message: string;
}
 

const getFacultyName = (id: string | null, otherId?: string | null): string => {
  if (!id && !otherId) return "TBD";
  if (id) {
    const f = FACULTY_LIST.find(x => x.id === id);
    if (f) return `${f.personal.firstName} ${f.personal.lastName}`;
  }
  if (otherId) {
    const guest = OTHER_FACULTY_LIST.find(x => x.id === otherId);
    if (guest) return guest.name; 
  }
  
  return "Guest Faculty"; // Fallback if not found in list
};

const getSubjectCode = (id: string): string =>
  SUBJECT_LIST.find(x => x.id === id)?.code ?? id;
 
const getRoomName = (id: string | null, otherId?: string | null): string => {
  if (!id && !otherId) return "TBD";
  
  // 1. Check Official Rooms
  if (id) {
    const r = ROOM_LIST.find(x => x.id === id);
    if (r) return (r as any).room ?? id;
  }
  
  // 2. Check Guest Rooms
  if (otherId) {
    const guestRoom = OTHER_ROOM_LIST.find(x => x.id === otherId);
    if (guestRoom) return guestRoom.name;
  }
  
  return "Guest Room"; // Fallback
};

 
const getPrefs = (facultyId: string | null) => {
  const faculty = FACULTY_LIST.find(f => f.id === facultyId);
  if (!faculty) return null;
  
  const prefs = faculty.preferences ?? {};
  
  // ✅ Ensure all fields have defaults
  return {
    subjectSpecializations: prefs.subjectSpecializations ?? [],
    unavailableDays:        prefs.unavailableDays        ?? [],
    preferredDays:          prefs.preferredDays          ?? ["Monday","Tuesday","Wednesday","Thursday","Friday", "Saturday"],
    unavailableTimeSlots:   prefs.unavailableTimeSlots   ?? [],
    preferredTimeRange:     prefs.preferredTimeRange      ?? { start: "07:00", end: "20:00" },
    preferredRoomTypes:     prefs.preferredRoomTypes      ?? ["lecture", "lab"],
    priority:               prefs.priority                ?? "medium",
    maxClassesPerDay:       prefs.maxClassesPerDay        ?? 3,
    maxConsecutiveHours:    prefs.maxConsecutiveHours     ?? 4,
  };
};

 
// ─────────────────────────────────────────────────────────────────────────────
// LOCAL VALIDATOR — Extended
// Checks all hard constraints locally for free before/after each API call
// ─────────────────────────────────────────────────────────────────────────────
 
export function validateLocally(sched: ScheduleAssignment[]): ValidationIssue[] {
  const results: ValidationIssue[] = [];
  const seen = new Set<string>();
 
  // Drop any entries that are missing required fields — Gemini occasionally
  // emits incomplete objects (no start_time / end_time / faculty_id) especially
  // in the fix round. Letting them through causes toMins("undefined".split…)
  // crashes. We log the count so the admin knows to review.
  const valid = sched.filter(s =>
    s.faculty_id && s.subject_id && s.room_id &&
    s.day && s.start_time && s.end_time && s.section
  );
  const dropped = sched.length - valid.length;
  if (dropped > 0) {
    console.warn(
      `[DeptFlow] validateLocally: dropped ${dropped} malformed entr${dropped === 1 ? "y" : "ies"} ` +
      `(missing required fields). These will not appear in the schedule.`
    );
  }
 
  // ── Pairwise checks ────────────────────────────────────────────────────────
  valid.forEach((a, i) => {
    valid.forEach((b, j) => {
      if (j <= i) return;
      const key = [a.schedule_id, b.schedule_id].sort().join("|");
      if (seen.has(key)) return;
 
      const sameGroup = a.session_group_id && a.session_group_id === b.session_group_id;
 
      // Skip split-session pairs — they belong to the same subject
      if (sameGroup) return;
 
    if (a.day === b.day && overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) {
        // HARD: professor double-booking
      if (a.faculty_id === b.faculty_id && a.faculty_id !== "TBD") {
          seen.add(key);
          results.push({
            id:      `time-${key}`,
            type:    "HARD",
            label:   "Professor Double-Booking",
            message: `${getFacultyName(a.faculty_id)} is double-booked on ${a.day}: ` +
                     `${getSubjectCode(a.subject_id)} (${a.start_time}–${a.end_time}) overlaps ` +
                     `${getSubjectCode(b.subject_id)} (${b.start_time}–${b.end_time}).`,
          });
        }
 
        // HARD: room double-booking
        if (a.room_id === b.room_id && a.room_id !== "TBD") {
          seen.add(key);
          results.push({
            id:      `room-${key}`,
            type:    "HARD",
            label:   "Room Double-Booking",
            message: `${getRoomName(a.room_id)} is double-booked on ${a.day} at ` +
                     `${a.start_time}–${a.end_time}: assigned to both ` +
                     `${getFacultyName(a.faculty_id)} (${getSubjectCode(a.subject_id)}) and ` +
                     `${getFacultyName(b.faculty_id)} (${getSubjectCode(b.subject_id)}).`,
          });
        }
      }
    });
 
    const prefs   = getPrefs(a.faculty_id);
    const subject = SUBJECT_LIST.find(s => s.id === a.subject_id) as any;
    const room    = ROOM_LIST.find(r => r.id === a.room_id) as any;
    const fname   = getFacultyName(a.faculty_id);
    const scode   = getSubjectCode(a.subject_id);
 
    if (prefs) {
      // HARD: faculty not specialised in this subject
      if (!prefs.subjectSpecializations.includes(a.subject_id)) {
        const alreadyFlagged = results.some(r => r.id === `spec-${a.faculty_id}-${a.subject_id}`);
        if (!alreadyFlagged) {
          results.push({
            id:      `spec-${a.faculty_id}-${a.subject_id}`,
            type:    "HARD",
            label:   "Outside Specialization",
            message: `${fname} is not qualified to teach ${scode}. ` +
                     `Their specializations are: [${prefs.subjectSpecializations.map(getSubjectCode).join(", ")}].`,
          });
        }
      }
 
      // HARD: faculty unavailable on this day
      if (prefs.unavailableDays.includes(a.day)) {
        results.push({
          id:      `unavailday-${a.schedule_id}`,
          type:    "HARD",
          label:   "Faculty Day Unavailability",
          message: `${fname} is not available on ${a.day} but is scheduled to teach ${scode}.`,
        });
      }
 
      // HARD: faculty blocked during this time slot
      for (const blocked of prefs.unavailableTimeSlots) {
        const [bS, bE] = blocked.split("-");
        if (overlaps(a.start_time, a.end_time, bS, bE)) {
          results.push({
            id:      `unavailtime-${a.schedule_id}-${blocked}`,
            type:    "HARD",
            label:   "Faculty Time Unavailability",
            message: `${fname} is unavailable during ${blocked} but ${scode} is scheduled ` +
                     `at ${a.start_time}–${a.end_time} on ${a.day}.`,
          });
          break;
        }
      }
 
      // HARD: max classes per day exceeded
      const classesOnDay = valid.filter(s =>
        s.faculty_id === a.faculty_id && s.day === a.day
      );
      if (classesOnDay.length > prefs.maxClassesPerDay) {
        const alreadyFlagged = results.some(r => r.id === `maxday-${a.faculty_id}-${a.day}`);
        if (!alreadyFlagged) {
          results.push({
            id:      `maxday-${a.faculty_id}-${a.day}`,
            type:    "HARD",
            label:   "Max Classes Per Day Exceeded",
            message: `${fname} has ${classesOnDay.length} classes on ${a.day}, ` +
                     `exceeding their limit of ${prefs.maxClassesPerDay}.`,
          });
        }
      }
 
      // HARD: max consecutive hours exceeded
      const dayClasses = valid
        .filter(s => s.faculty_id === a.faculty_id && s.day === a.day)
        .sort((x, y) => toMins(x.start_time) - toMins(y.start_time));
 
      let consecutiveHours = 0;
      let prevEnd = "";
      for (const cls of dayClasses) {
        if (prevEnd && toMins(cls.start_time) === toMins(prevEnd)) {
          consecutiveHours += (toMins(cls.end_time) - toMins(cls.start_time)) / 60;
        } else {
          consecutiveHours = (toMins(cls.end_time) - toMins(cls.start_time)) / 60;
        }
        prevEnd = cls.end_time;
        if (consecutiveHours > prefs.maxConsecutiveHours) {
          const alreadyFlagged = results.some(r => r.id === `consec-${a.faculty_id}-${a.day}`);
          if (!alreadyFlagged) {
            results.push({
              id:      `consec-${a.faculty_id}-${a.day}`,
              type:    "HARD",
              label:   "Max Consecutive Hours Exceeded",
              message: `${fname} teaches ${consecutiveHours} consecutive hours on ${a.day}, ` +
                       `exceeding their limit of ${prefs.maxConsecutiveHours} hours.`,
            });
          }
          break;
        }
      }
 
      // SOFT: scheduled outside preferred time range
      if (
        toMins(a.start_time) < toMins(prefs.preferredTimeRange.start) ||
        toMins(a.end_time)   > toMins(prefs.preferredTimeRange.end)
      ) {
        results.push({
          id:      `preftime-${a.schedule_id}`,
          type:    "SOFT",
          label:   "Outside Preferred Time",
          message: `${fname} prefers ${prefs.preferredTimeRange.start}–${prefs.preferredTimeRange.end} ` +
                   `but ${scode} is at ${a.start_time}–${a.end_time} on ${a.day}.`,
        });
      }
 
      // SOFT: scheduled on non-preferred day
      if (!prefs.preferredDays.includes(a.day)) {
        results.push({
          id:      `prefday-${a.schedule_id}`,
          type:    "SOFT",
          label:   "Non-Preferred Day",
          message: `${fname} prefers ${prefs.preferredDays.join("/")} but ${scode} ` +
                   `is scheduled on ${a.day}.`,
        });
      }
    }
 
    // HARD: wrong facility type
    if (subject && room) {
      const requiredType = subject.facilityType ?? "lecture";
      const roomType     = room.type ?? "lecture";
      if (requiredType !== roomType) {
        results.push({
          id:      `facility-${a.schedule_id}`,
          type:    "HARD",
          label:   "Wrong Facility Type",
          message: `${scode} requires a ${requiredType} room but is assigned to ` +
                   `${getRoomName(a.room_id)} which is a ${roomType}.`,
        });
      }
    }
 
    // HARD: load overload
    const fData = FACULTY_LIST.find(x => x.id === a.faculty_id);
    if (fData) {
      const maxUnits   = fData.personal.employmentType === "Part-Time" ? 12 : 21;
      const totalUnits = valid
        .filter(s => s.faculty_id === a.faculty_id)
        // For split sessions, only count units once per session_group
        .filter((s, _, arr) => {
          if (!s.session_group_id) return true;
          return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
        })
        .reduce((n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0);
 
      const overloadFlagged = results.some(r => r.id === `overload-fac-${a.faculty_id}`);
      if (totalUnits > maxUnits && !overloadFlagged) {
        // Build a list of the specific subjects assigned to this faculty so the
        // suggestion can name which ones to move rather than just a unit count.
        const assignedSubjects = valid
          .filter(s => s.faculty_id === a.faculty_id)
          .filter((s, _, arr) => {
            if (!s.session_group_id) return true;
            return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
          })
          .map(s => {
            const sub = SUBJECT_LIST.find(x => x.id === s.subject_id);
            return sub ? `${sub.code} (${sub.units}u)` : s.subject_id;
          });
        const excess = totalUnits - maxUnits;
        // Pick the smallest subjects whose total covers the excess — these are the ones to move
        const byUnits = [...assignedSubjects].sort();
        const toMove  = byUnits.slice(0, Math.ceil(excess / 3));
        results.push({
          id:      `overload-fac-${a.faculty_id}`,
          type:    "HARD",
          label:   "Load Overload",
          message: `${fname} is assigned ${totalUnits} units (max ${maxUnits}). ` +
                   `Assigned subjects: [${assignedSubjects.join(", ")}]. ` +
                   `Suggested to move: ${toMove.join(", ")} to a faculty member with remaining capacity.`,
        });
      }
 
      // SOFT: near limit
      const nearFlagged = results.some(r => r.id === `near-fac-${a.faculty_id}`);
      if (totalUnits > maxUnits * 0.85 && totalUnits <= maxUnits && !nearFlagged) {
        results.push({
          id:      `near-fac-${a.faculty_id}`,
          type:    "SOFT",
          label:   "Near Load Limit",
          message: `${fname} is at ${totalUnits}/${maxUnits} units (${Math.round(totalUnits / maxUnits * 100)}%). ` +
                   `Avoid adding more subjects.`,
        });
      }
    }
 
    // HARD: split session validation
    if (a.session_group_id) {
      const groupSessions = valid.filter(s => s.session_group_id === a.session_group_id);
      if (groupSessions.length === 2) {
        const subject = SUBJECT_LIST.find(s => s.id === a.subject_id) as any;
        if (subject) {
          const totalSessionHours = groupSessions.reduce((n, s) => {
            const hrs = s.session_hours ?? (toMins(s.end_time) - toMins(s.start_time)) / 60;
            return n + hrs;
          }, 0);
          if (totalSessionHours !== subject.units) {
            const alreadyFlagged = results.some(r => r.id === `split-${a.session_group_id}`);
            if (!alreadyFlagged) {
              results.push({
                id:      `split-${a.session_group_id}`,
                type:    "HARD",
                label:   "Split Session Hour Mismatch",
                message: `Split sessions for ${scode} (group ${a.session_group_id}) total ` +
                         `${totalSessionHours} hours but subject is ${subject.units} units. ` +
                         `Sessions must sum exactly to the subject's unit count.`,
              });
            }
          }
        }
      }
    }
  });
 
  // ── Uneven load distribution (SOFT) ───────────────────────────────────────
  const loads = FACULTY_LIST.map(f => {
    const units = valid
      .filter(s => s.faculty_id === f.id)
      .filter((s, _, arr) => {
        if (!s.session_group_id) return true;
        return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
      })
      .reduce((n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0);
    return { id: f.id, name: `${f.personal.firstName} ${f.personal.lastName}`, units };
  }).filter(x => x.units > 0);
 
  if (loads.length > 1) {
    const mx = Math.max(...loads.map(l => l.units));
    const mn = Math.min(...loads.map(l => l.units));
    if (mx - mn >= 6) {
      const hi = loads.find(l => l.units === mx)!;
      const lo = loads.find(l => l.units === mn)!;
      results.push({
        id:      "dist-soft",
        type:    "SOFT",
        label:   "Uneven Load Distribution",
        message: `${hi.name} has ${mx} units while ${lo.name} has only ${mn} — a ${mx - mn}-unit gap.`,
      });
    }
  }
    results.push(...validateLabLecPairing(sched))
    results.push(...validateNstpSunday(sched));
    results.push(...validateLabHours(sched));

  return results;
}



// ─────────────────────────────────────────────────────────────────────────────
// LAB-LEC PAIRING VALIDATOR
// Detects when a Lab and its paired Lecture for the same section are assigned
// to different faculty members. Returns HARD issues.
// ─────────────────────────────────────────────────────────────────────────────

function validateLabLecPairing(sched: ScheduleAssignment[]): ValidationIssue[] {

  const results: ValidationIssue[] = [];
  const seen = new Set<string>();

  // Group schedule by section

  const bySection: Record<string, ScheduleAssignment[]> = {};

  sched.forEach(s => {
    if (!bySection[s.section]) bySection[s.section] = [];
    bySection[s.section].push(s);
  });


  Object.entries(bySection).forEach(([section, entries]) => {

    const labs     = entries.filter(s => {
      const sub = SUBJECT_LIST.find(x => x.id === s.subject_id) as any;
      return sub?.facilityType === "lab";
    });

    const lectures = entries.filter(s => {
      const sub = SUBJECT_LIST.find(x => x.id === s.subject_id) as any;
      return sub?.facilityType === "lecture";
    });



    labs.forEach(lab => {
      const labSub  = SUBJECT_LIST.find(x => x.id === lab.subject_id) as any;
      if (!labSub) return;

      // Extract a "base name" by stripping "Lab"/"Lec" suffix and normalizing
      const getCourseBase = (code: string) => code.replace(/(1L|2L|1|2)(-[A-Z0-9]+)?$/i, "").trim().toUpperCase();
      
      const labBase = getCourseBase(labSub.code);

      lectures.forEach(lec => {
        const lecSub = getSubject(lec.subject_id); // Note: in geminiSchedHelper it's casted as 'as any'
        if (!lecSub) return;
        const lecBase = getCourseBase(lecSub.code);
        if (labBase !== lecBase) return; // different subjects, skip
        if (lab.faculty_id === lec.faculty_id) return; // correctly paired, skip
        if (lab.faculty_id === "TBD" || lec.faculty_id === "TBD") return; // TBD — skip
        
        const pairKey = [lab.schedule_id, lec.schedule_id].sort().join("|");
        
        if (seen.has(pairKey)) return;
        seen.add(pairKey);

        const labFaculty  = getFacultyName(lab.faculty_id);
        const lecFaculty  = getFacultyName(lec.faculty_id);

        results.push({
          id:      `lablec-${pairKey}`,
          type:    "HARD",
          label:   "Lab–Lec Faculty Mismatch",
          message: `${labSub.code} (Lab) for ${section} is assigned to ${labFaculty}, ` +
                   `but ${lecSub.code} (Lec) is assigned to ${lecFaculty}. ` +
                   `Lab and Lecture of the same subject must be handled by the same faculty ` +
                   `to count as 3 units total.`,
        });
      });
    });
  });

  return results;
}



// ─────────────────────────────────────────────────────────────────────────────
// NSTP SUNDAY VALIDATOR
// All NSTP-coded subjects must be scheduled on Sunday.
// ─────────────────────────────────────────────────────────────────────────────

function validateNstpSunday(sched: ScheduleAssignment[]): ValidationIssue[] {

  return sched.filter(s => {
      const sub = SUBJECT_LIST.find(x => x.id === s.subject_id) as any;
      return sub && sub.code.toUpperCase().includes("NSTP") && s.day !== "Sunday" && s.day !== "TBD";
    }).map(s => {
      const sub = SUBJECT_LIST.find(x => x.id === s.subject_id) as any;
      return {
        id:      `nstp-day-${s.schedule_id}`,
        type:    "HARD" as const,
        label:   "NSTP Must Be Sunday",
        message: `${sub?.code ?? s.subject_id} (${s.section}) is scheduled on ${s.day}. ` +
                 `NSTP subjects must always be scheduled on Sunday per curriculum policy.`,
      };

    });

}



// ─────────────────────────────────────────────────────────────────────────────
// LAB HOUR EXCEPTION VALIDATOR
// Lab subjects are 1 credit unit but require 2 clock hours.
// Flag entries where a lab subject is only allocated 1 hour.
// ─────────────────────────────────────────────────────────────────────────────

function validateLabHours(sched: ScheduleAssignment[]): ValidationIssue[] {
  return sched.filter(s => {
      if (s.day === "TBD" || !s.start_time || !s.end_time) return false;
      const sub = SUBJECT_LIST.find(x => x.id === s.subject_id) as any;
      if (!sub || sub.facilityType !== "lab") return false;
      const clockHours = (toMins(s.end_time) - toMins(s.start_time)) / 60;
      // Lab subjects need 2 clock hours (1 unit × 2 hr/unit for labs)
      return clockHours < 2;
    }).map(s => {
      const sub    = SUBJECT_LIST.find(x => x.id === s.subject_id) as any;
      const actual = (toMins(s.end_time) - toMins(s.start_time)) / 60;
      const endMins = toMins(s.start_time) + 120;
      const fixedEnd = `${String(Math.floor(endMins / 60)).padStart(2,"0")}:${String(endMins % 60).padStart(2,"0")}`;
      
      return {
        id:      `labhr-${s.schedule_id}`,
        type:    "HARD" as const,
        label:   "Lab Requires 2 Clock Hours",
        message: `${sub?.code ?? s.subject_id} (${s.section}) is a lab subject (1 unit = 2 clock hrs) ` +
                 `but is only scheduled for ${actual} hr. Adjust end_time to ${fixedEnd} ` +
                 `(or split into 2 separate sessions).`,
      };

    });

}

 
// ─────────────────────────────────────────────────────────────────────────────
// FACULTY UTILIZATION BUILDER
// Computes per-faculty unit usage, subject list, and reason for non-utilization.
// Called after schedule generation so the UI can display it.
// ─────────────────────────────────────────────────────────────────────────────

function buildFacultyUtilization(sched: ScheduleAssignment[]): FacultyUtilization[] {
  return FACULTY_LIST.map(f => {
    const prefs   = getPrefs(f.id);
    const maxUnits = f.personal.employmentType === "Part-Time" ? 12 : 21;

    const myEntries = sched.filter(s => s.faculty_id === f.id)
      .filter((s, _, arr) => {
        if (!s.session_group_id) return true;
        return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
      });

    const assignedUnits = myEntries.reduce(
      (n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0
    );

    const subjects = myEntries.map(s =>
      SUBJECT_LIST.find(x => x.id === s.subject_id)?.code ?? s.subject_id
    );

    // Build a human-readable reason when a faculty has zero assignments
    let notUsedReason: string | undefined;
    if (assignedUnits === 0 && prefs) {
      const specs = prefs.subjectSpecializations;
      const anySubjectInSchedule = sched.some(s => specs.includes(s.subject_id));
      if (specs.length === 0) {
        notUsedReason = "No subject specializations defined.";
      } else if (!anySubjectInSchedule) {
        notUsedReason = "Their specializations were not required this semester.";
      } else if (prefs.unavailableDays.length >= 5) {
        notUsedReason = "Marked unavailable on most days.";
      } else {
        notUsedReason = "All their subjects were covered by other faculty; no remaining capacity needed.";
      }
    }

    return {
      facultyId:     f.id,
      name:          `${f.personal.firstName} ${f.personal.lastName}`,
      assignedUnits,
      maxUnits,
      utilization:   Math.round((assignedUnits / maxUnits) * 100),
      subjects,
      notUsedReason,
    };
  });
}



// ─────────────────────────────────────────────────────────────────────────────
// CURRICULUM COMPLETENESS CHECKER
// After generation, compares what Gemini produced against every required
// section × subject pair in the curriculum. Missing entries are returned
// as ValidationIssues (HARD) so the admin can see exactly what is absent
// and the fix round can be triggered to fill the gaps.
// ─────────────────────────────────────────────────────────────────────────────
 
export interface MissingEntry {
  section:   string;  // e.g. "BSCS 1-A"
  subjectId: string;  // e.g. "cs101"
  subjectCode: string;
  program:   string;
}
 
// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — generateSchedule()
// Runs one Gemini call per program IN PARALLEL via Promise.all().
// Expected time: ~45–90 seconds (vs 5–6 minutes for a single monolithic call).
// ─────────────────────────────────────────────────────────────────────────────
 
export interface GenerateScheduleOptions {
  /** Which semester to generate (1 = 1st sem, 2 = 2nd sem). Defaults to 1. */
  sem?: 1 | 2;
  schoolYear?: number;
}
 
export async function generateSchedule(
  options: GenerateScheduleOptions = {}
): Promise<GenerationResult> {
  console.log("[DeptFlow] Starting Deterministic Generation Engine...");

  // 🚩 We extract the variables right at the start to stamp them later!
  const { sem = 1, schoolYear } = options; 

  // 1. Fetch Data (Keep your existing API calls)
  const [facRes, subRes, roomRes, currRes] = await Promise.all([
    api.get("/manage-schedule/faculty"),
    api.get("/manage-schedule/subjects"),
    api.get("/manage-schedule/rooms"),
    api.get("/manage-schedule/curriculums"),
  ]);

  const rawFac  = facRes.data || facRes;
  const rawSub  = subRes.data || subRes;
  const rawRoom = roomRes.data || roomRes;
  const rawCurr = currRes.data || currRes;

  // 2. Map Faculty & Rooms (Keep your existing mapping logic here)
  FACULTY_LIST = rawFac.filter((f: any) => {
    const status = f.personal
      ? (typeof f.personal === 'string' ? JSON.parse(f.personal) : f.personal)?.status
      : f.status;
    return status === "Active" || !status; 
  }).map((f: any) => {
    const personal = f.personal
      ? (typeof f.personal === 'string' ? JSON.parse(f.personal) : f.personal)
      : null;

    return {
      id: f.id || f.faculty_id,  
      personal: {
        firstName:      personal?.firstName      ?? f.first_name,
        lastName:       personal?.lastName       ?? f.last_name,
        employmentType: personal?.employmentType ?? f.employment_type ?? "Full-time",
        status:         personal?.status         ?? f.status          ?? "Active",
      },

      preferences: (() => {
        // 1. Hunt down the actual preference object
        let p: any = {};
        if (f.faculty_preferences && Array.isArray(f.faculty_preferences) && f.faculty_preferences.length > 0) {
          p = f.faculty_preferences[0];
        } else if (f.faculty_preferences && typeof f.faculty_preferences === 'object') {
          p = f.faculty_preferences;
        } else if (f.preferences) {
          p = typeof f.preferences === 'string' ? JSON.parse(f.preferences) : f.preferences;
        }

        // 2. Safely parse stringified arrays (e.g., '["CC113-M", "CS201-M"]')
        const safeParseArray = (val: any, fallback: any[]) => {
          if (!val) return fallback;
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') {
            try {
              // Handle Supabase Postgres text array format "{Item1, Item2}"
              if (val.startsWith('{') && val.endsWith('}')) {
                 return val.slice(1, -1).split(',').map(s => s.replace(/"/g, '').trim());
              }
              // Handle standard JSON string '["Item1", "Item2"]'
              return JSON.parse(val.replace(/""/g, '"'));
            } catch (e) {
              console.warn(`[DeptFlow] Failed to parse preference array: ${val}`);
              return fallback;
            }
          }
          return fallback;
        };

        // 3. Prepare fallbacks
        const allSubjects = rawSub.map((s: any) => (s.subject_code ?? s.code ?? "").trim().toUpperCase());

        // 4. Extract and clean the subject specializations
        // Try snake_case first (Supabase native), then camelCase (frontend mapping)
        const rawSpecializations = p.subject_specializations || p.subjectSpecializations;
        let finalSpecializations = safeParseArray(rawSpecializations, allSubjects);
        
        // Ensure every subject in the array is an uppercase string for perfect matching
        finalSpecializations = finalSpecializations.map((s: any) => String(s).trim().toUpperCase());

        // Log it so you can verify in your browser console!
        console.log(`[DeptFlow] Loaded Specializations for ${f.first_name}:`, finalSpecializations);

        return {
          subjectSpecializations: finalSpecializations,
          preferredDays:          safeParseArray(p.preferred_days || p.preferredDays, ["Monday","Tuesday","Wednesday","Thursday","Friday"]),
          unavailableDays:        safeParseArray(p.unavailable_days || p.unavailableDays, []),
          preferredTimeRange:     { 
            start: (p.time_start || p.preferredTimeRange?.start || "07:00").substring(0, 5), 
            end:   (p.time_end || p.preferredTimeRange?.end || "19:00").substring(0, 5) 
          },
          preferredRoomTypes:     safeParseArray(p.preferred_room_types || p.preferredRoomTypes, ["lab","lecture"]),
          maxClassesPerDay:       p.max_classes_per_day || p.maxClassesPerDay || 3,
          maxConsecutiveHours:    p.max_consecutive_hours || p.maxConsecutiveHours || 4,
        };
      })()
    };
  });

  ROOM_LIST = rawRoom.map((r: any) => ({
    id:       r.id,
    room:     r.room, 
    type:     r.type,
    capacity: r.capacity ?? 40,
  }));   // (Keep your detailed mapping from earlier)

  // 3. Smart Subject Classifier (Crucial for routing)
  SUBJECT_LIST = rawSub.map((s: any) => {
    const code = (s.subject_code ?? s.code ?? "").trim().toUpperCase();

    let category: "CORE" | "EXTERNAL" | "OJT" = "CORE";
    if (code === "CS403-M" || code === "IS406-M" || code === "IT406-M") {
      category = "OJT";
    } else if (code.startsWith("GE") || code.startsWith("MATHA") || code.includes("NSTP") || code.startsWith("PE")) {
      category = "EXTERNAL";
    }

    return {
      id: code,
      code: code,
      name: s.subject_name ?? s.name,
      units: s.units ?? 0,
      facilityType: s.facility_type ?? "lecture",
      category: category, 
    };
  });

  // 4. Curriculum Mapping
  CURRICULUM = rawCurr.map((c: any) => {
    const sections = c.curriculum_sections || [];
    const subjects = c.curriculum_term_subjects || [];
    return {
      program: c.program,
      sections: sections.map((sec: any) => {
        const requiredSubjects = subjects.filter((sub: any) => sub.year_level === sec.year_level && sub.semester === sem);
        return {
          label: `${c.program} ${sec.year_level}-${sec.section}`, 
          yearLevel: sec.year_level,
          subjectIds: requiredSubjects.flatMap((sub: any) => {
            if (Array.isArray(sub.subject_codes)) return sub.subject_codes;
            if (typeof sub.subject_codes === 'string') { try { return JSON.parse(sub.subject_codes); } catch { return []; } }
            if (sub.subject_code) return [sub.subject_code];
            return [];
          })
        };
      })
    };
  });

  // ============================================================================
  // THE DETERMINISTIC LOOP
  // ============================================================================
  const draftSchedule: ScheduleAssignment[] = [];
  let idCounter = 0;

  const facultyLoadTracker: Record<string, number> = {};
  FACULTY_LIST.forEach((f: any) => {
    facultyLoadTracker[f.id] = 0; // Everyone starts at 0 units
  });

  // Helper to safely stamp our data
  const createEntry = (data: Partial<ScheduleAssignment>): ScheduleAssignment => ({
    schedule_id: `gen-${Date.now()}-${idCounter++}`,
    faculty_id: data.faculty_id || "TBD",
    subject_id: data.subject_id || "",
    room_id: data.room_id || "TBD",
    day: data.day || "TBD",
    start_time: data.start_time || "TBD",
    end_time: data.end_time || "TBD",
    section: data.section || "",
    status: "draft",
    semester: sem,                     // 🚩 STAMPED PERFECTLY!
    school_year: schoolYear || null,   // 🚩 STAMPED PERFECTLY!
    ...data
  });

  const allSections: { label: string, yearLevel: number, subjectIds: string[] }[] = [];
  for (const prog of CURRICULUM) {
    for (const sec of prog.sections) {
      allSections.push(sec);
    }
  }

  allSections.sort((a, b) => (Number(a.yearLevel) || 99) - (Number(b.yearLevel) || 99));

  // Find the Dept Head for OJT
  const deptHead = FACULTY_LIST.find((f: any) => f.personal?.designation?.toLowerCase().includes("head"));

  // Loop through every program -> section -> subject

    for (const sec of allSections) {
      for (const subId of sec.subjectIds) {
        const subject = SUBJECT_LIST.find((s: any) => s.id === subId);
        if (!subject) continue;

        // --- RULE 1: OJT ROUTING ---
        if (subject.category === "OJT") {
          draftSchedule.push(createEntry({
            subject_id: subject.id,
            section: sec.label,
            faculty_id: deptHead ? deptHead.id : "TBD", // Assign to Head
            room_id: "TBD",    // No room needed
            day: "TBD",        // No day needed
            start_time: "TBD", // No time needed
            end_time: "TBD"
          }));
          continue;
        }

        // --- RULE 2: EXTERNAL (GE/PE/NSTP) ROUTING ---
        if (subject.category === "EXTERNAL") {
          const units = subject.units || 3;
          const targetDay = subject.code.includes("NSTP") ? "Sunday" : "Monday";
          let hour = 7;
          while (hour + units <= 19) {
            const busy = draftSchedule.some(s => s.day === targetDay && s.section === sec.label && 
                         overlaps(`${hour}:00`, `${hour+units}:00`, s.start_time, s.end_time));
            if (!busy) break;
            hour++;
          }
          draftSchedule.push(createEntry({ subject_id: subject.id, section: sec.label, day: targetDay,
            start_time: `${String(hour).padStart(2, "0")}:00`, end_time: `${String(hour + units).padStart(2, "0")}:00` }));
          continue;
        }

        // --- RULE 3: CORE SUBJECTS ---
        if (subject.category === "CORE") {
          const totalUnits = subject.units || 3;
          const needsSplit = totalUnits > 3 || subject.code.includes("MATHA");
          const sessions = needsSplit ? [3, 2] : [totalUnits];

          const isLab = subject.facilityType === "lab";

          for (const sUnits of sessions) {
            const clockHours = isLab ? sUnits * 2 : sUnits;
            const getCourseBase = (code: string) => code.replace(/(1L|2L|1|2)(-[A-Z0-9]+)?$/i, "");
            const myBase = getCourseBase(subject.code);
            
            const siblingEntry = draftSchedule.find(s =>
              s.section === sec.label &&
              s.faculty_id !== "TBD" &&
              getCourseBase(s.subject_id.split("-")[0]) === myBase // Quick split to handle IDs properly
            );

            let facId = "TBD";

            if (siblingEntry) {
              // FORCE PAIRING: Bypass load balancing and use the sibling's professor!
              facId = siblingEntry.faculty_id || "TBD";
              if (facId !== "TBD") facultyLoadTracker[facId] += sUnits;
            } else {
              // Normal load-balanced assignment + Lowercase "Part-time" fix
              let eligibleFac = FACULTY_LIST.filter(f => f.preferences?.subjectSpecializations?.includes(subject.id) && 
                                (facultyLoadTracker[f.id] + sUnits) <= (String(f.personal.employmentType).toLowerCase().includes("part") ? 12 : 21))
                                .sort((a,b) => facultyLoadTracker[a.id] - facultyLoadTracker[b.id]);

              facId = eligibleFac[0]?.id || "TBD";
              if (facId !== "TBD") facultyLoadTracker[facId] += sUnits; 
            }

            const rooms = ROOM_LIST.filter(r => r.type.toLowerCase() === subject.facilityType.toLowerCase());
            let finalDay = "TBD", finalStart = 0, finalRoom = "TBD", found = false;

            const targetFac = FACULTY_LIST.find((f: any) => f.id === facId);
            const prefs = targetFac?.preferences;
          
            const prefDays: string[] = (prefs?.preferredDays?.length) ? prefs.preferredDays : DAYS;
            const orderedDays = [...new Set([...prefDays, ...DAYS])];
            
            const prefStart = parseInt(prefs?.preferredTimeRange?.start?.split(":")[0] || "7");
            const prefEnd = parseInt(prefs?.preferredTimeRange?.end?.split(":")[0] || "19");

            const allHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
            const prefHours = allHours.filter(h => h >= prefStart && (h + clockHours) <= prefEnd);
            const fallbackHours = allHours.filter(h => !prefHours.includes(h) && (h + clockHours) <= 19);
            const orderedHours = [...prefHours, ...fallbackHours];


            for (const d of orderedDays) {
              if (found) break;
              // Prevent same section from having the same subject twice in one day
              if (draftSchedule.some(s => s.subject_id === subject.id && s.section === sec.label && s.day === d)) continue;

              // 🚨 FIX: Now looping through `orderedHours` instead of `let h = 7...`
              for (const h of orderedHours) {
                if (found) break;
                
                // Check if faculty or section is busy
                if (draftSchedule.some(s => s.day === d && (s.section === sec.label || s.faculty_id === facId) && 
                    overlaps(`${h}:00`, `${h+clockHours}:00`, s.start_time, s.end_time))) continue;

                // Find a free room
                for (const r of rooms) {
                  if (!draftSchedule.some(s => s.day === d && s.room_id === r.id && 
                      overlaps(`${h}:00`, `${h+clockHours}:00`, s.start_time, s.end_time))) {
                    finalDay = d; finalStart = h; finalRoom = r.id; found = true; break;
                  }
                }
              }
            }
           draftSchedule.push(createEntry({ 
              subject_id: subject.id, section: sec.label, faculty_id: facId, 
              room_id: finalRoom, day: finalDay, 
              start_time: `${String(finalStart).padStart(2, "0")}:00`, 
              end_time: `${String(finalStart + clockHours).padStart(2, "0")}:00`, 
              session_hours: clockHours 
            }));
          }
        }
      }
    }

  console.log(`[DeptFlow] Deterministic Engine created ${draftSchedule.length} entries.`);

  // Return the draft! (No AI calls needed yet)
  return {
    schedule: draftSchedule,
    reasoning: "Deterministic baseline generated successfully.",
    facultyUtilization: buildFacultyUtilization(draftSchedule), 
    missingEntries: [] as MissingEntry[], // 🚩 FIX: explicitly cast the empty array
  };
}
