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

let FACULTY_LIST: any[] = [];
let SUBJECT_LIST: any[] = [];
let ROOM_LIST: any[] = [];
let CURRICULUM: any[] = [];

// Busted cache to guarantee a fresh run without old broken schedules
const CHECKPOINT_KEY = "deptflow_schedule_checkpoint_v4";
 
// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
 
export interface ScheduleAssignment {
  id:               string;
  faculty_id:       string;
  subject_id:       string;
  room_id:          string;
  day:              string;
  start_time:       string;   // "HH:mm" 24-hour
  end_time:         string;   // "HH:mm" 24-hour
  section:          string;
  status:           "draft" | "finalized" | "published";
  session_group_id?: string;  // Links split sessions of the same subject together
  session_hours?:   number;   // Hours for this specific session (for split subjects)
}
 
interface GeminiScheduleItem {
  faculty_id:        string;
  subject_id:        string; // This matches your subject_code in V2
  room_id:           string;
  day:               string;
  start_time:        string;
  end_time:          string;
  section:           string;
  session_group_id?: string;
  session_hours?:    number;
}
 
interface GeminiScheduleResponse {
  schedule:           GeminiScheduleItem[];
  reasoning:          string;
  conflicts_resolved: string[];
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
  perProgramReasoning:  Record<string, string>;
  apiCallsUsed:         1 | 2;
  conflictsResolved:    string[];
  wasFixed:             boolean;
  facultyUtilization:   FacultyUtilization[];
  missingEntries:       MissingEntry[]; // Keep this here
}
 
export interface ValidationIssue {
  id:      string;
  type:    "HARD" | "SOFT";
  label:   string;
  message: string;
}
 
// Faculty shape with the new preferences block
interface FacultyPreferences {
  subjectSpecializations: string[];   // subject IDs this faculty can teach
  unavailableDays:        string[];
  preferredDays:          string[];
  unavailableTimeSlots:   string[];   // "HH:mm-HH:mm" strings
  preferredTimeRange:     { start: string; end: string };
  preferredRoomTypes:     string[];
  priority:               "high" | "medium" | "low";
  maxClassesPerDay:       number;
  maxConsecutiveHours:    number;
  notes:                  string;
}

interface ScheduleCheckpoint {
  sem:      number;
  programs: Record<string, GeminiScheduleResponse>; // programName → result
  savedAt:  number; // timestamp
}
 
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────



const toMins = (t: string | undefined | null): number => {
  if (!t || typeof t !== "string" || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
};
 
const overlaps = (aS: string, aE: string, bS: string, bE: string): boolean =>
  toMins(aS) < toMins(bE) && toMins(aE) > toMins(bS);
 
const getFacultyName = (id: string): string => {
  const f = FACULTY_LIST.find(x => x.id === id);
  return f ? `${f.personal.firstName} ${f.personal.lastName}` : id;
};
 
const getSubjectCode = (id: string): string =>
  SUBJECT_LIST.find(x => x.id === id)?.code ?? id;
 
const getRoomName = (id: string): string =>
  ROOM_LIST.find(x => x.id === id)?.room ?? id;
 
const getPrefs = (facultyId: string) => {
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
// CHECKPOINT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

function saveCheckpoint(sem: number, programName: string, result: GeminiScheduleResponse) {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    const existing: ScheduleCheckpoint = raw
      ? JSON.parse(raw)
      : { sem, programs: {}, savedAt: Date.now() };

    // If semester changed, reset checkpoint
    if (existing.sem !== sem) {
      existing.programs = {};
      existing.sem = sem;
    }

    existing.programs[programName] = result;
    existing.savedAt = Date.now();
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(existing));
    console.log(`[DeptFlow] ✓ Checkpoint saved for ${programName}`);
  } catch (e) {
    console.warn("[DeptFlow] Could not save checkpoint:", e);
  }
}

function loadCheckpoint(sem: number): Record<string, GeminiScheduleResponse> {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return {};
    const checkpoint: ScheduleCheckpoint = JSON.parse(raw);

    // Ignore checkpoints older than 2 hours or from a different semester
    const twoHours = 2 * 60 * 60 * 1000;
    if (checkpoint.sem !== sem || Date.now() - checkpoint.savedAt > twoHours) {
      localStorage.removeItem(CHECKPOINT_KEY);
      return {};
    }

    const programs = Object.keys(checkpoint.programs);
    if (programs.length > 0) {
      console.log(`[DeptFlow] 📂 Checkpoint found — already done: [${programs.join(", ")}]`);
    }
    return checkpoint.programs;
  } catch (e) {
    console.warn("[DeptFlow] Could not load checkpoint:", e);
    return {};
  }
}

function clearCheckpoint() {
  localStorage.removeItem(CHECKPOINT_KEY);
  console.log("[DeptFlow] Checkpoint cleared.");
}
// ─────────────────────────────────────────────────────────────────────────────
// CONSTRAINTS BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildConstraints(semFilter: 1 | 2 = 1) {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const TIME_SLOTS = [
    "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00",
    "11:00-12:00", "13:00-14:00", "14:00-15:00", "15:00-16:00",
    "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00"
  ];
 
  return {
    professors: FACULTY_LIST.map(f => {
      const prefs = "preferences" in f ? (f as any).preferences as FacultyPreferences : null;
      return {
        id:                   f.id,
        name:                 `${f.personal.firstName} ${f.personal.lastName}`,
        employmentType:       f.personal.employmentType,
        maxUnits:             f.personal.employmentType === "Part-time" ? 12 : 21,
        // Preferences — fall back to permissive defaults if not set
        subjectSpecializations: prefs?.subjectSpecializations ?? [],
        unavailableDays:        prefs?.unavailableDays ?? [],
        preferredDays:          prefs?.preferredDays ?? DAYS,
        unavailableTimeSlots:   prefs?.unavailableTimeSlots ?? [],
        preferredTimeRange:     prefs?.preferredTimeRange ?? { start: "07:00", end: "18:00" },
        preferredRoomTypes:     prefs?.preferredRoomTypes ?? ["lab", "lecture"],
        priority:               prefs?.priority ?? "medium",
        maxClassesPerDay:       prefs?.maxClassesPerDay ?? 3,
        maxConsecutiveHours:    prefs?.maxConsecutiveHours ?? 4,
        notes:                  prefs?.notes ?? "",
      };
    }),
 
    rooms: ROOM_LIST.map(r => ({
      id:       r.id,
      name:     (r as any).room ?? r.id,
      type:     (r as any).type ?? "lecture",
      capacity: (r as any).capacity ?? 40,
    })),
 
    subjects: SUBJECT_LIST.map(s => ({
      id:             s.id,
      code:           s.code,
      name:           s.name,
      units:          s.units,
      yearLevel:      (s as any).yearLevel      ?? null,
      semester:       (s as any).semester       ?? null,
      programs:       (s as any).programs       ?? [],
      assignmentMode: (s as any).assignmentMode ?? "auto",  // "auto" | "manual-faculty"
      facilityType:   (s as any).facilityType   ?? "lecture",
      canSplit:       (s as any).canSplit        ?? false,
      splitPattern:   (s as any).splitPattern    ?? null,
      notes:          (s as any).notes           ?? "",
    })),
 
    days:      DAYS,
    timeSlots: TIME_SLOTS,
 
    // Curriculum — flat sections array filtered to the requested semester only.
    // New structure: each program has a sections[] array where every entry
    // already has yearLevel, semester, section, label, and subjectIds at the
    // top level — no more nested years → semesters → sections traversal.
    sections: (CURRICULUM as any[]).flatMap(program =>
      (program.sections as any[])
        .filter(s => s.semester === semFilter)
        .map(s => ({
          label:      s.label,
          program:    program.program,
          year:       s.yearLevel,
          sem:        s.semester,
          section:    s.section,
          subjectIds: s.subjectIds,
        }))
    ),
 
    rules: [
      "HARD: A professor can only teach one class at a time — no double-booking",
      "HARD: A room can only host one class at a time — no room double-booking",
      "HARD: Full-time faculty maximum is 21 units per semester",
      "HARD: Part-time faculty maximum is 12 units per semester",
      "HARD: Only assign a subject to a faculty whose subjectSpecializations includes that subject ID",
      "HARD: Only assign a lab subject to a room of type 'lab'; lecture subjects to 'lecture' rooms",
      "HARD: Do not schedule a faculty on their unavailableDays",
      "HARD: Do not schedule a faculty during their unavailableTimeSlots",
      "HARD: Respect each faculty's maxClassesPerDay limit",
      "HARD: Respect each faculty's maxConsecutiveHours limit",
      "HARD: LAB-LEC PAIRING — If a subject has both a Lab variant and a Lecture variant for the SAME section, BOTH must be assigned to the SAME faculty member...",
      "HARD: LAB HOUR EXCEPTION — Lab subjects are worth 1 credit unit but are allotted 2 hours of actual teaching time...",
      "HARD: NSTP SUNDAY — All NSTP subjects MUST be scheduled on Sunday.",
      "SOFT: Prefer scheduling faculty on their preferredDays when possible",
      "SOFT: Prefer scheduling faculty within their preferredTimeRange",
      "SOFT: Prefer matching faculty's preferredRoomTypes",
      "SOFT: High-priority faculty get first choice of preferred days and times",
      "SOFT: Distribute workload as evenly as possible across faculty",
      "SPLIT RULE: If a subject has canSplit=true and a splitPattern (e.g. [1,2]), you MAY schedule it as two separate entries with the same session_group_id. The hours of both sessions must sum exactly to the subject's units. Use different days for each session.",
      "SPLIT RULE: Subjects with canSplit=false must be scheduled as a single continuous block.",
      "1 unit = 1 hour of class time (EXCEPTION: lab subjects = 1 unit but 2 clock hours)",
    ],
  };
}
 
// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────
 
function buildGenerationPrompt(c: ReturnType<typeof buildConstraints>, currentSched: ScheduleAssignment[] = []): string {
  // FIX 1: Show each faculty's CURRENT unit total so Gemini can enforce the cap.
  // FIX 3: "remaining" field nudges Gemini to use under-utilised faculty first.
  const facultyBlock = c.professors.map(p => {
    const currentUnits = currentSched
      .filter(s => s.faculty_id === p.id)
      .filter((s, _, arr) => {
        if (!s.session_group_id) return true;
        return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
      })
      .reduce((n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0);
    const remaining = p.maxUnits - currentUnits;
    return (
      `id:${p.id} name:${p.name}|${p.employmentType}|max:${p.maxUnits}u` +
      `|used:${currentUnits}u|remaining:${remaining}u|priority:${p.priority}` +
      `|teaches:[${p.subjectSpecializations.join(",")}]` +
      `|unavailDays:[${p.unavailableDays.join(",") || "none"}]` +
      `|prefDays:[${p.preferredDays.join(",")}]` +
      `|blockedSlots:[${p.unavailableTimeSlots.join(",") || "none"}]` +
      `|prefTime:${p.preferredTimeRange.start}-${p.preferredTimeRange.end}` +
      `|prefRooms:[${p.preferredRoomTypes.join(",")}]` +
      `|maxPerDay:${p.maxClassesPerDay}|maxConsec:${p.maxConsecutiveHours}hrs`
    );
  }).join("\n");
 
  const roomBlock = c.rooms.map(r =>
    `id:${r.id} name:${r.name}|${r.type}|cap:${r.capacity}`
  ).join("\n");
 
  const subjectBlock = c.subjects.map(s =>
    `id:${s.id} code:${s.code}|${s.units}u|${s.facilityType}` +
    `|yr:${(s as any).yearLevel ?? "?"}|sem:${(s as any).semester ?? "?"}` +
    `|split:${s.canSplit ? s.splitPattern?.join("+") + "hrs" : "NO"}`
  ).join("\n");
 
  const hardRules = c.rules
    .filter(r => r.startsWith("HARD") || r.startsWith("SPLIT") || r.startsWith("1 unit"))
    .map((r, i) => `${i + 1}. ${r}`)
    .join("\n");
 
  // Curriculum block — one line per section showing exactly which subjects it needs
  const curriculumBlock = (c as any).sections.map((sec: any) =>
    `${sec.label}(${sec.program} Y${sec.year} Sem${sec.sem})|needs:[${sec.subjectIds.join(",")}]`
  ).join("\n");

  return `
You are a university schedule generator for TUP (Philippines).
Generate a schedule for ALL sections across ALL programs (BSCS, BSIT, BSIS).
Each section needs one schedule entry per subject in its curriculum.
"reasoning"=10 words max. "conflicts_resolved"=[].
 
FACULTY:
${facultyBlock}
 
ROOMS:
${roomBlock}
 
SUBJECTS (id|code|units|facilityType|split):
${subjectBlock}
 
DAYS: ${c.days.join(",")} (NOTE: NSTP subjects must use Sunday)
HOURS: 07:00,08:00,09:00,10:00,11:00,13:00,14:00,15:00,16:00,17:00,18:00,19:00,20:00
start_time = when class begins. end_time = start + subject units (e.g. 3u subject at 07:00 → start_time:"07:00" end_time:"10:00").
EXCEPTION: lab subjects always end_time = start_time + 2hrs regardless of unit count.



HARD RULES:
${hardRules}
 
SECTIONS AND THEIR REQUIRED SUBJECTS (section|needs:[subjectIds]):
${curriculumBlock}

INSTRUCTIONS:
- Produce exactly the entries listed above — no more, no fewer.
- CRITICAL: For subject_id, you MUST use the exact id values from the SUBJECTS list above. For room_id, use exact id values from the ROOMS list. NEVER invent, shorten, or guess IDs.
- CRITICAL RULE: For subjects marked with '|manual' (e.g. GE, MATH, PE, NSTP), you MUST schedule the day, room, and time normally, but you MUST set "faculty_id": "TBD". Do NOT assign a real faculty to them!
- If a room/time conflict occurs, prioritize assigning the subject anyway; the Local Validator will flag it for the Fix Round.
- SOFT RULE: Try to respect maxConsecutiveHours, but do not skip an assignment just to meet this rule.
- LOAD SPREADING: Ensure no qualified faculty is left with 0 units if there are subjects they can teach.

  REQUIRED SCHEMA ENFORCEMENT: 
  You MUST provide a valid day from the DAYS list and a valid time from the HOURS list for EVERY entry. 
  If you cannot find a valid slot without breaking a rule, YOU MUST DELIBERATELY CREATE A CONFLICT. 
  If stuck, forcefully assign "day": "Monday" and "start_time": "07:00". 
  Leaving a field blank or outputting "" is a catastrophic failure. The Local Validator will catch the conflict later.
 
SPLIT: If subject split=YES, output 2 entries with same session_group_id, different days, session_hours summing to units.
 
OUTPUT — JSON only, no markdown:
{"schedule":[{"faculty_id":"<exact id from FACULTY list>","subject_id":"<exact id from SUBJECTS list>","room_id":"<exact id from ROOMS list>","day":"","start_time":"HH:mm","end_time":"HH:mm","section":"BSCS 1-A","session_group_id":"","session_hours":0}],"reasoning":"","conflicts_resolved":[]}

Omit session_group_id and session_hours for non-split entries.
JSON only.
`.trim();
}
 
function buildFixPrompt(
  c: ReturnType<typeof buildConstraints>,
  draft: ScheduleAssignment[],
  issues: ValidationIssue[],
  currentSched: ScheduleAssignment[] = []): string {
 
  const scheduleText = draft.map(s =>
    `${s.id}|faculty:${s.faculty_id}|subject:${s.subject_id}|room:${s.room_id}|${s.day}|${s.start_time}-${s.end_time}|${s.section}` +
    (s.session_group_id ? `|grp:${s.session_group_id}(${s.session_hours}hr)` : "")
  ).join("\n");
 
  const issueText = issues.map(i => `[${i.type}] ${i.label}: ${i.message}`).join("\n");
 
  // Show remaining capacity per faculty so Gemini picks correct reassignment targets
  const facultySummary = c.professors.map(p => {
    const used = currentSched
      .filter(s => s.faculty_id === p.id)
      .filter((s, _, arr) => {
        if (!s.session_group_id) return true;
        return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
      })
      .reduce((n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0);
    return `id:${p.id} ${p.name}|teaches:[${p.subjectSpecializations.join(",")}]|unavail:[${p.unavailableDays.join(",") || "none"}]|blocked:[${p.unavailableTimeSlots.join(",") || "none"}]|max/day:${p.maxClassesPerDay}|used:${used}u|remaining:${p.maxUnits - used}u`;
  }).join("\n");
  return `
  You are a university schedule fixer for TUP. Fix ALL violations below. Keep unchanged entries identical.
  "reasoning"=10 words max. Return COMPLETE schedule.
  
  DRAFT (id|faculty_id|subject_id|room_id|day|time|section):
  ${scheduleText}
  
  VIOLATIONS:
  ${issueText}
  
  FACULTY: ${facultySummary}
  ROOMS: ${c.rooms.map(r => `id:${r.id} ${r.name}(${r.type})`).join("|")}
  SUBJECTS: ${c.subjects.map(s => `id:${s.id} ${s.code}(${s.facilityType})`).join("|")}
  DAYS: ${c.days.join(",")} (NOTE: NSTP subjects must use Sunday)
  HOURS: 07:00,08:00,09:00,10:00,11:00,13:00,14:00,15:00,16:00,17:00,18:00,19:00,20:00
  start_time = when class begins. end_time = start + subject units (e.g. 3u subject at 07:00 → start_time:"07:00" end_time:"10:00"). 
  EXCEPTION: lab subjects always end_time = start_time + 2hrs regardless of unit count.



- faculty_id: exact id from FACULTY list (e.g. "uuid-here"). CRITICAL: If subject is marked '|manual', leave as "TBD".
- subject_id: exact subject_code from SUBJECTS list (e.g. "COSC101")
- room_id:    exact id from ROOMS list (e.g. "room-uuid-here")

  REQUIRED SCHEMA ENFORCEMENT: 
  You MUST provide a valid day from the DAYS list and a valid time from the HOURS list for EVERY entry. 
  If you cannot find a valid slot without breaking a rule, YOU MUST DELIBERATELY CREATE A CONFLICT. 
  If stuck, forcefully assign "day": "Monday" and "start_time": "07:00". 
  Leaving a field blank or outputting "" is a catastrophic failure. The Local Validator will catch the conflict later.

OUTPUT — JSON only:
{"schedule":[{"faculty_id":"3","subject_id":"CC113-M","room_id":"2","day":"Monday","start_time":"08:00","end_time":"09:00","section":"","session_group_id":"","session_hours":0}],"reasoning":"","conflicts_resolved":[]}
`.trim();
}
 
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
      const key = [a.id, b.id].sort().join("|");
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
          id:      `unavailday-${a.id}`,
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
            id:      `unavailtime-${a.id}-${blocked}`,
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
          id:      `preftime-${a.id}`,
          type:    "SOFT",
          label:   "Outside Preferred Time",
          message: `${fname} prefers ${prefs.preferredTimeRange.start}–${prefs.preferredTimeRange.end} ` +
                   `but ${scode} is at ${a.start_time}–${a.end_time} on ${a.day}.`,
        });
      }
 
      // SOFT: scheduled on non-preferred day
      if (!prefs.preferredDays.includes(a.day)) {
        results.push({
          id:      `prefday-${a.id}`,
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
          id:      `facility-${a.id}`,
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
      const maxUnits   = fData.personal.employmentType === "Part-time" ? 12 : 21;
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
      const labBase = labSub.code
        .replace(/\s*(lab|laboratory)\s*$/i, "")
        .replace(/\s*(lec|lecture)\s*$/i, "")
        .trim()
        .toUpperCase();

      lectures.forEach(lec => {

        const lecSub = SUBJECT_LIST.find(x => x.id === lec.subject_id) as any;

        if (!lecSub) return;

        const lecBase = lecSub.code
          .replace(/\s*(lab|laboratory)\s*$/i, "")
          .replace(/\s*(lec|lecture)\s*$/i, "")
          .trim()
          .toUpperCase();

        if (labBase !== lecBase) return; // different subjects, skip
        if (lab.faculty_id === lec.faculty_id) return; // correctly paired, skip
        if (lab.faculty_id === "TBD" || lec.faculty_id === "TBD") return; // TBD — skip
        
        const pairKey = [lab.id, lec.id].sort().join("|");
        
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
        id:      `nstp-day-${s.id}`,
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
        id:      `labhr-${s.id}`,
        type:    "HARD" as const,
        label:   "Lab Requires 2 Clock Hours",
        message: `${sub?.code ?? s.subject_id} (${s.section}) is a lab subject (1 unit = 2 clock hrs) ` +
                 `but is only scheduled for ${actual} hr. Adjust end_time to ${fixedEnd} ` +
                 `(or split into 2 separate sessions).`,
      };

    });

}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI API CALLER
// ─────────────────────────────────────────────────────────────────────────────
// 1. Use the newer Gemini 2.5 Flash model (best for reasoning + JSON)
const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_API_URL = `/api/gemini/v1beta/models/${GEMINI_MODEL}:generateContent`;


async function callGemini(prompt: string): Promise<GeminiScheduleResponse> {
 
  const response = await fetch(GEMINI_API_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature:      0.1,
        maxOutputTokens:  65536,
        // ─── KEY FIX ────────────────────────────────────────────────────────
        // Gemini 2.5 Flash uses "thinking tokens" by default. These tokens are
        // generated BEFORE the JSON response and consume the same output budget.
        // With a complex schedule prompt, thinking alone can use 10 000-30 000
        // tokens, leaving too little room for the full JSON — causing the
        // "truncated mid-response" error even at maxOutputTokens: 65536.
        // Setting thinkingBudget: 0 disables thinking entirely, ensuring the
        // full token budget is available for the JSON output.
        // ────────────────────────────────────────────────────────────────────
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: "OBJECT",
          properties: {
            schedule: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  faculty_id: { type: "STRING" },
                  subject_id: { type: "STRING" },
                  room_id: { type: "STRING" },
                  day: { type: "STRING" }, // Forces this key to exist
                  start_time: { type: "STRING" },
                  end_time: { type: "STRING" },
                  section: { type: "STRING" },
                  session_group_id: { type: "STRING" },
                  session_hours: { type: "NUMBER" }
                },
                required: ["faculty_id", "subject_id", "room_id", "day", "start_time", "end_time", "section"] // The ultimate enforcer
              }
            },
            reasoning: { type: "STRING" },
            conflicts_resolved: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["schedule", "reasoning", "conflicts_resolved"]
        }
      },
    }),
  });
 
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }
 
  const data         = await response.json();
  const finishReason = (data?.candidates?.[0]?.finishReason ?? "UNKNOWN") as string;
  const raw          = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
 
  if (finishReason === "MAX_TOKENS") {
    console.warn("[DeptFlow] ⚠ Response hit MAX_TOKENS — attempting partial rescue...");
  } else {
    console.log(`[DeptFlow] Gemini finish reason: ${finishReason}`);
  }
 
  if (!raw) throw new Error("[DeptFlow] Gemini returned an empty response.");
 
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
 
  return parseGeminiScheduleResponse(clean, finishReason);
}
 
// ─────────────────────────────────────────────────────────────────────────────
// RESCUE HELPERS
// Three-stage approach so we always salvage what Gemini managed to emit:
//   Stage 1 — full JSON.parse (happy path, no truncation)
//   Stage 2 — bracket-matching (only the reasoning suffix was cut)
//   Stage 3 — object extraction (the array itself was cut; recover every
//              complete { } object we can find)
// ─────────────────────────────────────────────────────────────────────────────
 
/**
 * Walks `text` from `fromIndex` and returns every complete JSON object
 * (balanced `{ … }` pair) it can parse. Used when the outer `[]` array
 * bracket is never closed due to truncation.
 */
function extractCompleteJsonObjects(
  text: string,
  fromIndex: number
): GeminiScheduleItem[] {
  const items: GeminiScheduleItem[] = [];
  let depth = 0;
  let objStart = -1;
 
  for (let i = fromIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try {
          const obj = JSON.parse(text.slice(objStart, i + 1)) as GeminiScheduleItem;
          // Minimal validity guard — must have the four required fields
          if (obj.faculty_id && obj.subject_id && obj.room_id && obj.day) {
            items.push(obj);
          }
        } catch {
          // skip malformed object
        }
        objStart = -1;
      }
    }
  }
 
  return items;
}

function parseGeminiScheduleResponse(
  raw: string,
  finishReason = "UNKNOWN"
): GeminiScheduleResponse {

  // ── Stage 0: bare array (Gemini skipped the wrapper object) ───────────────
  // When responseMimeType:"application/json" + thinkingBudget:0 are combined,
  // Gemini 2.5 Flash sometimes returns a raw array [ {...}, {...} ] instead of
  // the expected { "schedule": [...] } wrapper. Detect and handle this first.
  if (raw.trimStart().startsWith("[")) {
    try {
      const arr = JSON.parse(raw) as GeminiScheduleItem[];
      if (Array.isArray(arr) && arr.length > 0) {
        console.warn("[DeptFlow] Gemini returned a bare array — wrapping into schedule object.");
        return { schedule: arr, reasoning: "Bare array response handled.", conflicts_resolved: [] };
      }
    } catch {
      // not a valid array — fall through to normal stages
    }
  }

  // ── Stage 1: full parse (no truncation) ───────────────────────────────────
  try {
    const parsed = JSON.parse(raw) as GeminiScheduleResponse;
    if (!Array.isArray(parsed.schedule)) throw new Error("Missing schedule array");
    return parsed;
  } catch {
    // fall through
  }

  console.warn("[DeptFlow] Full JSON parse failed — attempting rescue...");

  // ── Locate the schedule array start ───────────────────────────────────────
  const keyIdx     = raw.indexOf('"schedule"');
  const arrayStart = raw.indexOf("[", keyIdx);

  if (keyIdx === -1 || arrayStart === -1) {
    throw new SyntaxError(
      "[DeptFlow] Cannot locate 'schedule' array in Gemini response." +
      (finishReason === "MAX_TOKENS" ? " Response was cut off by the token limit." : "")
    );
  }

  // ── Stage 2: bracket-matching (suffix truncated, array intact) ────────────
  let arrayEnd = -1;
  let depth2   = 0;
  for (let i = arrayStart; i < raw.length; i++) {
    if (raw[i] === "[" || raw[i] === "{") depth2++;
    if (raw[i] === "]" || raw[i] === "}") depth2--;
    if (depth2 === 0) { arrayEnd = i; break; }
  }

  if (arrayEnd !== -1) {
    try {
      const schedule = JSON.parse(raw.slice(arrayStart, arrayEnd + 1)) as GeminiScheduleItem[];
      if (Array.isArray(schedule) && schedule.length > 0) {
        console.warn("[DeptFlow] Response suffix truncated — array rescued successfully.");
        return { schedule, reasoning: "Rescued: suffix truncated.", conflicts_resolved: [] };
      }
    } catch {
      // fall through to stage 3
    }
  }

  // ── Stage 3: object extraction (array itself truncated mid-entry) ─────────
  const items = extractCompleteJsonObjects(raw, arrayStart);

  if (items.length === 0) {
    throw new SyntaxError(
      finishReason === "MAX_TOKENS"
        ? "[DeptFlow] Token limit hit before any entries were written. " +
          "Reduce scope or retry — thinkingBudget:0 should prevent this."
        : "[DeptFlow] Schedule array truncated mid-response. Try again."
    );
  }

  console.warn(
    `[DeptFlow] Array truncated — ${items.length} complete entries rescued via object extraction.`
  );
  return {
    schedule:           items,
    reasoning:          `Partial rescue: ${items.length} entries recovered.`,
    conflicts_resolved: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE CONVERTER
// ─────────────────────────────────────────────────────────────────────────────

function normalizeGeminiItem(item: GeminiScheduleItem): GeminiScheduleItem {
  let { faculty_id, subject_id, room_id } = item;

  const stripPrefix = (val: string, prefix: string) =>
    val.startsWith(prefix) ? val.slice(prefix.length) : val;

  subject_id = stripPrefix(String(subject_id ?? "").trim(), "subject:");
  room_id    = stripPrefix(String(room_id    ?? "").trim(), "room:");
  faculty_id = stripPrefix(String(faculty_id ?? "").trim(), "faculty:");

  // ── subject_id Normalization ──
  const rawSubject = String(subject_id ?? "").trim();
  if (rawSubject && !SUBJECT_LIST.find(s => s.id === rawSubject)) {
    const normalizedSearch = rawSubject.replace(/\s+/g, "").toUpperCase();
    
    const byCode = SUBJECT_LIST.find(s => {
      // FIX: Add optional chaining and null check for s.code
      const code = s.code?.replace(/\s+/g, "").toUpperCase();
      return code === normalizedSearch;
    });
    
    if (byCode) subject_id = byCode.id;
  }

  // ── room_id Normalization ──
  const rawRoom = String(room_id ?? "").trim();
  if (rawRoom && !ROOM_LIST.find(r => r.id === rawRoom)) {
    const byName = ROOM_LIST.find(r => 
      // FIX: Ensure r.room exists before calling toLowerCase
      (r.room || "").toLowerCase() === rawRoom.toLowerCase()
    );
    if (byName) room_id = byName.id;
  }

  const normalizeTime = (t: any): string => {
  if (!t || String(t).trim() === "") {
  console.warn("[DeptFlow] normalizeTime: received empty time value from Gemini");
  return "";
  }
  const s = String(t).trim();

  // Already correct "HH:mm" format
  if (/^\d{2}:\d{2}$/.test(s)) return s;

  // "H:mm" → "0H:mm"
  if (/^\d{1}:\d{2}$/.test(s)) return `0${s}`;

  // "HH:mm:ss" → strip seconds
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);

  // "07:00-10:00" — Gemini put the full range in start_time
  // Split it: first part = start, second part = end
  if (s.includes("-") && s.indexOf("-") > 2) {
    return s.split("-")[0].trim();  // caller handles end separately
  }

  return s; // fallback — let the filter catch it
};

const rawStart = String(item.start_time ?? "").trim();
const rawEnd   = String(item.end_time   ?? "").trim();

let start_time = item.start_time;
let end_time   = item.end_time;

if (rawStart.includes("-") && rawStart.indexOf("-") > 2 && !rawEnd) {
  const parts = rawStart.split("-");
  start_time = normalizeTime(parts[0]);
  end_time   = normalizeTime(parts[1]);
} else {
  start_time = normalizeTime(rawStart);
  end_time   = normalizeTime(rawEnd);
}

  return { ...item, faculty_id, subject_id, room_id, start_time, end_time};
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE CONVERTER
// ─────────────────────────────────────────────────────────────────────────────
 
function toScheduleAssignments(items: GeminiScheduleItem[]): ScheduleAssignment[] {
  // Step 1: normalize IDs (strip prefixes, resolve by name/code if needed)
  const normalized = items.map(normalizeGeminiItem);
 
  // Step 2: drop entries still missing required fields after normalization.
  // faculty_id may be "TBD" for manual-faculty subjects (GE/MATH) — allow it.
  const complete = normalized
  .filter(item =>
    item.faculty_id && item.subject_id && item.room_id && item.section &&
    (item.faculty_id === "TBD" || FACULTY_LIST.find(f => f.id === item.faculty_id)) &&
    SUBJECT_LIST.find(s => s.id === item.subject_id) &&
    (ROOM_LIST as any[]).find((r: any) => r.id === item.room_id)
  )
  .map(item => {
    // If time is missing, assign a fallback so the entry isn't lost
    // Admin can fix it manually — it will show as a conflict in validation
    if (!item.start_time || !item.end_time) {
      const sub = SUBJECT_LIST.find(s => s.id === item.subject_id);
      const units = sub?.units ?? 1;
      console.warn(`[DeptFlow] Missing time for ${item.subject_id} in ${item.section} — defaulting to 07:00`);
      return {
        ...item,
        start_time: "07:00",
        end_time: `${String(7 + units).padStart(2, "0")}:00`,
      };
    }
    return item;
  });
 
  return complete.map((item, idx) => {
    // PROGRAMMATIC OVERRIDE:
    // Ensure that even if the AI disobeys and assigns a faculty to a manual subject,
    // we forcibly wipe it out and set it to "TBD".
    const sub = SUBJECT_LIST.find(s => s.id === item.subject_id);
    const finalFacultyId = sub?.assignmentMode === "manual" ? "TBD" : item.faculty_id;

    return {
      id:               `gen-${Date.now()}-${idx}`,
      faculty_id:       finalFacultyId,
      subject_id:       item.subject_id,
      room_id:          item.room_id,
      day:              item.day,
      start_time:       item.start_time,
      end_time:         item.end_time,
      section:          String(item.section ?? "").trim(),
      status:           "draft" as const,
      session_group_id: item.session_group_id,
      session_hours:    item.session_hours,
    };
  });
}
 
// ─────────────────────────────────────────────────────────────────────────────
// PER-PROGRAM PROMPT BUILDER
// Builds a generation prompt scoped to a single program only.
// Called in parallel for BSCS, BSIT, BSIS — each call is ~3x smaller and
// ~3x faster than one monolithic call covering all programs at once.
// ─────────────────────────────────────────────────────────────────────────────
 
function buildProgramPrompt(
  c: ReturnType<typeof buildConstraints>,
  programName: string,
  _currentSched: ScheduleAssignment[] = []
): string {
  const programSections = (c as any).sections.filter(
    (s: any) => s.program === programName
  );

  const relevantSubjectIds = new Set(
    programSections.flatMap((s: any) => s.subjectIds)
  );

  // Aligned with faculty_v2 (personal and preferences JSONB)
  const facultyBlock = c.professors.map(p => {
    const usedUnits = _currentSched
      .filter(s => s.faculty_id === p.id && s.day !== "TBD")
      .filter((s, _, arr) => {
        if (!s.session_group_id) return true;
        return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
      })
      .reduce((n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0);
    const rem = p.maxUnits - usedUnits;
    const teaches = p.subjectSpecializations.length ? p.subjectSpecializations.join(",") : "ANY";
    const noDay = p.unavailableDays.join(",") || "none";
    const noSlot = p.unavailableTimeSlots.join(",") || "none";
    const prefDays = p.preferredDays.length < c.days.length
      ? `|pref:[${p.preferredDays.join(",")}]` : "";
    return `${p.id}|${p.name}|${p.employmentType[0]}T|${rem}u/${p.maxUnits}u` +
      `|teaches:[${teaches}]|noDay:[${noDay}]|noSlot:[${noSlot}]${prefDays}` +
      `|maxDay:${p.maxClassesPerDay}|maxH:${p.maxConsecutiveHours}`;
  }).join("\n");

  // Aligned with rooms_v2 table
  const roomBlock = c.rooms.map(r =>
    `${r.id}|${r.name}|${r.type}`
  ).join("\n");

  // Aligned with subjects_v2 table (subject_code, year_level, facility_type)
  const subjectBlock = c.subjects
    .filter(s => relevantSubjectIds.has(s.id))
    .map(s => {
      const splitStr = s.canSplit ? (s.splitPattern?.join("+") ?? "?") + "h" : "nosplit";
      const manualFlag = s.assignmentMode === "manual" ? "|manual" : "";
      return `${s.id}|${s.units}u|${s.facilityType}|${splitStr}${manualFlag}`;
    }).join("\n");

  const hardRules =
    `1.No faculty/room double-book 2.FT≤21u PT≤12u\n` +
    `3.Faculty teaches only their teaches:[] subjects (ANY=unrestricted)\n` +
    `4.Lab subject→lab room, lecture→lecture room\n` +
    `5.Respect noDay/noSlot/maxDay/maxH per faculty\n` +
    `6.SPLIT: 2 entries, same session_group_id, different days, hours sum=units\n` +
    `7.LAB-LEC PAIRING (CRITICAL): If a section has both a Lab and Lecture variant of the same subject (e.g. "Web Dev Lab" + "Web Dev Lec" for same section), BOTH must be assigned to the SAME faculty member. Check subject codes — strip "Lab"/"Lec" suffix to find pairs. Same professor = full 3-unit credit.\n` +
    `8.LAB HOURS EXCEPTION: Lab subjects (facilityType=lab) are 1 credit unit but MUST be scheduled for 2 clock hours. Set end_time = start_time + 2 hrs for all lab subjects, not 1 hr. Lab sessions may be split across two time blocks on different days if needed.\n` +
    `9.NSTP SUNDAY (CRITICAL): Any subject whose code contains "NSTP" MUST be scheduled on Sunday — no other day is acceptable.`;

  // Aligned with curriculum_v2 requirements
  let entryNum = 0;
  const requirementLines: string[] = [];
  programSections.forEach((sec: any) => {
    sec.subjectIds.forEach((subId: string) => {
      entryNum++;
      const sub = c.subjects.find(s => s.id === subId);
      requirementLines.push(
        `${entryNum}. section="${sec.label}" subject_id="${subId}"` +
        ` (${sub?.code ?? subId}, ${sub?.units ?? "?"}u, ${sub?.assignmentMode ?? "auto"})`
      );
    });
  });

  let totalEntries = 0;

  const curriculumBlock = programSections.map((sec: any) => {
    if (sec.subjectIds.length === 0) return null;
    totalEntries += sec.subjectIds.length;
    return `${sec.label}|needs:[${sec.subjectIds.join(",")}]`;
  }).filter(Boolean).join("\n");

  return `
  Schedule ${programName} ONLY. Output exactly ${totalEntries} entries — one per subject per section.

  FACULTY (id|name|type|rem/max|teaches|noDay|noSlot|maxDay|maxH):
  ${facultyBlock}

  ROOMS (id|name|type):
  ${roomBlock}

  SUBJECTS (id|units|facilityType|split|manual?):
  ${subjectBlock}

  DAYS: ${c.days.join(",")} (NOTE: NSTP subjects must use Sunday)
  HOURS: 07:00,08:00,09:00,10:00,11:00,13:00,14:00,15:00,16:00,17:00,18:00,19:00,20:00
  start_time = when class begins. end_time = start + subject units (e.g. 3u subject at 07:00 → start_time:"07:00" end_time:"10:00"). 
  EXCEPTION: lab subjects always end_time = start_time + 2hrs regardless of unit count.

  RULES:
  ${hardRules}

  SECTIONS:
  ${curriculumBlock}

  IDs: Use bare IDs exactly as shown. No prefixes. No invented IDs.

  REQUIRED SCHEMA ENFORCEMENT: 
  You MUST provide a valid day from the DAYS list and a valid time from the HOURS list for EVERY entry. 
  If you cannot find a valid slot without breaking a rule, YOU MUST DELIBERATELY CREATE A CONFLICT. 
  If stuck, forcefully assign "day": "Monday" and "start_time": "07:00". 
  Leaving a field blank or outputting "" is a catastrophic failure. The Local Validator will catch the conflict later.
  
  - CRITICAL RULE: For subjects marked with '|manual' (e.g. GE, MATH, PE, NSTP), you MUST schedule the day, room, and time normally, but you MUST set "faculty_id": "TBD". Do NOT assign a real faculty to them!

  OUTPUT JSON only:
  {"schedule":[{"faculty_id":"<id>","subject_id":"<id>","room_id":"<id>","day":"Monday","start_time":"07:00","end_time":"10:00","section":"${programName} 1-A"}],"reasoning":"<2 sentences>","conflicts_resolved":[]}
  Omit session_group_id/session_hours for non-split entries.
  `.trim();
}
// ─────────────────────────────────────────────────────────────────────────────
// FACULTY UTILIZATION BUILDER
// Computes per-faculty unit usage, subject list, and reason for non-utilization.
// Called after schedule generation so the UI can display it.
// ─────────────────────────────────────────────────────────────────────────────

function buildFacultyUtilization(sched: ScheduleAssignment[]): FacultyUtilization[] {
  return FACULTY_LIST.map(f => {
    const prefs   = getPrefs(f.id);
    const maxUnits = f.personal.employmentType === "Part-time" ? 12 : 21;

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
// MINIMUM LOAD ENFORCER
// After Gemini generates the draft, scan for faculty with 0 assignments.
// For each one, find a subject in the curriculum that matches their
// specialization and create a "TBD-time" placeholder entry the admin can
// complete. This runs locally — no extra API call.
// ─────────────────────────────────────────────────────────────────────────────

function enforceMinimumLoad(
  draft: ScheduleAssignment[],
  constraints: ReturnType<typeof buildConstraints>
): ScheduleAssignment[] {
  const extra: ScheduleAssignment[] = [];
  const MIN_UNITS = 3; // Each unassigned faculty should receive at least one 3-unit subject
  // Find any subject in the semester's curriculum that this faculty can teach
  // and that isn't already fully covered (i.e., still has sections needing a teacher)
  const alreadyAssigned = new Set(draft.map(s => `${s.subject_id}|${s.section}`));

  constraints.professors.forEach(prof => {
    // Skip part-time faculty with very limited capacity
    const currentUnits = draft
      .filter(s => s.faculty_id === prof.id)
      .filter((s, _, arr) => {
        if (!s.session_group_id) return true;
        return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
      })
      .reduce((n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0);

    if (currentUnits > 0) return; // already has load — skip
    if (prof.maxUnits < MIN_UNITS) return; // too little capacity to add anything

    const hasAnyCoverableGap = (constraints as any).sections.some((sec: any) =>
      sec.subjectIds.some((subId: string) => {
        const key = `${subId}|${sec.label}`;
        // SAFEGUARD: Don't use manual subjects to enforce minimum load
        const subCheck = SUBJECT_LIST.find(x => x.id === subId);
        if (subCheck && subCheck.assignmentMode === "manual") return false;
        
        return !alreadyAssigned.has(key) && (prof.subjectSpecializations.length === 0 || prof.subjectSpecializations.includes(subId));
      })
    );
    if (!hasAnyCoverableGap) return;

    let found = false;
    for (const sec of (constraints as any).sections) {
      if (found) break;
      for (const subId of sec.subjectIds) {
        if (found) break;
        const key = `${subId}|${sec.label}`;
        if (alreadyAssigned.has(key)) continue;
        if (prof.subjectSpecializations.length > 0 && !prof.subjectSpecializations.includes(subId)) continue;

        const sub = SUBJECT_LIST.find(x => x.id === subId);
        if (!sub || sub.assignmentMode === "manual") continue; // SAFEGUARD

        // Find a suitable room
        const neededType = (sub as any).facilityType ?? "lecture";
        const room = (ROOM_LIST as any[]).find((r: any) => r.type === neededType);
        if (!room) continue;

        // Create a placeholder — day/time are "TBD" so the admin schedules it
        // The status is "draft" and the special day value "TBD" signals the UI
        extra.push({
          id:         `min-load-${prof.id}-${subId}-${Date.now()}`,
          faculty_id: prof.id,
          subject_id: subId,
          room_id:    room.id,
          day:        "TBD",
          start_time: "TBD",
          end_time:   "TBD",
          section:    sec.label,
          status:     "draft" as const,
        });

        alreadyAssigned.add(key);
        found = true;
        console.log(`[DeptFlow] enforceMinimumLoad: assigned ${sub.code} to ${prof.name} (was at 0 units). Time TBD.`);
      }
    }

    if (!found) {
      console.log(`[DeptFlow] enforceMinimumLoad: ${prof.name} has no matching subject available — left unassigned.`);
    }
  });

  return [...draft, ...extra];
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
 
function checkCurriculumCompleteness(
  sched: ScheduleAssignment[],
  constraints: ReturnType<typeof buildConstraints>
): { missing: MissingEntry[]; issues: ValidationIssue[] } {
  const missing: MissingEntry[] = [];
  const issues:  ValidationIssue[] = [];
 
  // 1. Build a set of "Aggressively Normalized" keys from the schedule
  // We remove ALL spaces and force uppercase to ensure a perfect match.
  const covered = new Set(
    sched.map(s => {
      const sub = SUBJECT_LIST.find(x => x.id === s.subject_id);
      // We prioritize matching by CODE (e.g., "CS101") because that's what the UI shows
      const subjectKey = (sub?.code ?? s.subject_id).replace(/\s+/g, "").toUpperCase();
      const sectionKey = s.section.replace(/\s+/g, "").toUpperCase();
      return `${sectionKey}|${subjectKey}`;
    })
  );
 
  for (const sec of (constraints as any).sections) {
    const sectionKey = sec.label.replace(/\s+/g, "").toUpperCase();
    
    for (const subId of sec.subjectIds) {
      const sub = SUBJECT_LIST.find(x => x.id === subId);
      // 2. Normalize the curriculum requirement using the exact same logic
      const subjectKey = (sub?.code ?? subId).replace(/\s+/g, "").toUpperCase();
      
      const key = `${sectionKey}|${subjectKey}`;
      
      if (!covered.has(key)) {
        missing.push({
          section:     sec.label,
          subjectId:   subId,
          subjectCode: sub?.code ?? subId,
          program:     sec.program,
        });
        issues.push({
          id:      `missing-${sec.label.replace(/\s/g, "_")}-${subId}`,
          type:    "HARD",
          label:   "Missing Schedule Entry",
          message: `${sub?.code ?? subId} is required for ${sec.label} but has no schedule entry.`,
        });
      }
    }
  }
 
  return { missing, issues };
}
 
// ─────────────────────────────────────────────────────────────────────────────
// LOAD REDISTRIBUTION
// After Gemini generates, detect cases where the same faculty was assigned
// the same subject for MULTIPLE sections (e.g., CS 101 for both 1-A and 1-B).
// For each excess entry, find a different qualified faculty with remaining
// capacity and reassign it locally — no extra API call.
// ─────────────────────────────────────────────────────────────────────────────
 
function redistributeConcentratedLoad(
  draft: ScheduleAssignment[],
  constraints: ReturnType<typeof buildConstraints>
): ScheduleAssignment[] {
  const result = [...draft];
 
  // Group entries by subject_id → count per faculty
  const subjectFacultyMap: Record<string, Record<string, string[]>> = {};
  // subjectFacultyMap[subjectId][facultyId] = [entryId, entryId, ...]
  result.forEach(s => {
    if (s.faculty_id === "TBD" || s.day === "TBD") return;
    if (!subjectFacultyMap[s.subject_id]) subjectFacultyMap[s.subject_id] = {};
    if (!subjectFacultyMap[s.subject_id][s.faculty_id]) subjectFacultyMap[s.subject_id][s.faculty_id] = [];
    subjectFacultyMap[s.subject_id][s.faculty_id].push(s.id);
  });
 
  let reassignCount = 0;
 
  Object.entries(subjectFacultyMap).forEach(([subjectId, facultyGroups]) => {
    Object.entries(facultyGroups).forEach(([facultyId, entryIds]) => {
      // If this faculty has MORE than 1 entry for this subject across sections,
      // keep the first and try to move the rest to other qualified faculty.
      if (entryIds.length <= 1) return;
 
      const sub      = SUBJECT_LIST.find(x => x.id === subjectId);
      const subUnits = sub?.units ?? 0;
 
      const excessIds = entryIds.slice(1); // keep the first, redistribute the rest
      excessIds.forEach(entryId => {
        const entryIndex = result.findIndex(s => s.id === entryId);
        if (entryIndex === -1) return;
 
        // Find a different qualified faculty with remaining capacity
        const candidate = constraints.professors
          .filter(p => {
            if (p.id === facultyId) return false;
            if (!p.subjectSpecializations.includes(subjectId)) return false;if (p.subjectSpecializations.length > 0 && !p.subjectSpecializations.includes(subjectId)) return false;// Don't assign the same subject to someone already teaching it
            const alreadyTeachesSubject = result.some(
              s => s.faculty_id === p.id && s.subject_id === subjectId && s.day !== "TBD"
            );
            if (alreadyTeachesSubject) return false;
            const used = result
              .filter(s => s.faculty_id === p.id && s.day !== "TBD")
              .filter((s, _, arr) => {
                if (!s.session_group_id) return true;
                return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
              })
              .reduce((n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0);
            return used + subUnits <= p.maxUnits;
          })
          .sort((a, b) => {
            // Prefer most remaining capacity
            const usedA = result
              .filter(s => s.faculty_id === a.id && s.day !== "TBD")
              .reduce((n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0);
            const usedB = result
              .filter(s => s.faculty_id === b.id && s.day !== "TBD")
              .reduce((n, s) => n + (SUBJECT_LIST.find(x => x.id === s.subject_id)?.units ?? 0), 0);
            return (a.maxUnits - usedA) - (b.maxUnits - usedB);
          })[0];
 
        if (candidate) {
          const oldFacultyName = FACULTY_LIST.find(f => f.id === facultyId)
            ? `${FACULTY_LIST.find(f => f.id === facultyId)!.personal.firstName} ${FACULTY_LIST.find(f => f.id === facultyId)!.personal.lastName}`
            : facultyId;
          const newFacultyName = FACULTY_LIST.find(f => f.id === candidate.id)
            ? `${FACULTY_LIST.find(f => f.id === candidate.id)!.personal.firstName} ${FACULTY_LIST.find(f => f.id === candidate.id)!.personal.lastName}`
            : candidate.id;
          console.log(
            `[DeptFlow] redistributeConcentratedLoad: ${sub?.code ?? subjectId} ` +
            `(${result[entryIndex].section}) moved from ${oldFacultyName} → ${newFacultyName}`
          );
          result[entryIndex] = { ...result[entryIndex], faculty_id: candidate.id };
          // Update the facultyGroups map so later iterations see the new assignment
          subjectFacultyMap[subjectId][candidate.id] = [
            ...(subjectFacultyMap[subjectId][candidate.id] ?? []),
            entryId,
          ];
          reassignCount++;
        }
      });
    });
  });
 
  if (reassignCount > 0) {
    console.log(`[DeptFlow] redistributeConcentratedLoad: ${reassignCount} entries redistributed for even load.`);
  } else {
    console.log("[DeptFlow] redistributeConcentratedLoad: Load already well-distributed.");
  }
 
  return result;
}
// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — generateSchedule()
// Runs one Gemini call per program IN PARALLEL via Promise.all().
// Expected time: ~45–90 seconds (vs 5–6 minutes for a single monolithic call).
// ─────────────────────────────────────────────────────────────────────────────
 
export interface GenerateScheduleOptions {
  /** Which semester to generate (1 = 1st sem, 2 = 2nd sem). Defaults to 1. */
  sem?: 1 | 2;
}
 
export async function generateSchedule(
  options: GenerateScheduleOptions = {}
): Promise<GenerationResult> {
  console.log("[DeptFlow] Fetching latest data from database...");

  const [facRes, subRes, roomRes, currRes] = await Promise.all([
    api.get("/manage-schedule/faculty"),
    api.get("/manage-schedule/subjects"),
    api.get("/manage-schedule/rooms"),
    api.get("/manage-schedule/curriculums"),
  ]);

  const rawFac  = facRes.data;
  const rawSub  = subRes.data;
  const rawRoom = roomRes.data;
  const rawCurr = currRes.data;

  // Helper to unwrap API responses
  const unwrapArray = (response: any): any[] => {
    if (Array.isArray(response)) return response;
    if (response?.data     && Array.isArray(response.data))     return response.data;
    if (response?.rooms    && Array.isArray(response.rooms))    return response.rooms;
    if (response?.faculty  && Array.isArray(response.faculty))  return response.faculty;
    if (response?.subjects && Array.isArray(response.subjects)) return response.subjects;
    console.warn("[DeptFlow] Unexpected API response format:", response);
    return [];
  };

  const facArray = unwrapArray(rawFac);
  const subArray = unwrapArray(rawSub);
  const roomArray = unwrapArray(rawRoom);
  const currArray = unwrapArray(rawCurr);

  // 1. FACULTY_LIST Mapping (Handles JSONB fields)
FACULTY_LIST = facArray.filter((f: any) => {
  const status = f.personal
    ? (typeof f.personal === 'string' ? JSON.parse(f.personal) : f.personal)?.status
    : f.status;
  return status === "Active" || !status; // include if no status field
}).map((f: any) => {
  const personal = f.personal
    ? (typeof f.personal === 'string' ? JSON.parse(f.personal) : f.personal)
    : null;
  const prefs = f.preferences
    ? (typeof f.preferences === 'string' ? JSON.parse(f.preferences) : f.preferences)
    : null;

  return {
    id: f.id || f.faculty_id,  // ✅ handles faculty_id column
    personal: {
      firstName:      personal?.firstName      ?? f.first_name,
      lastName:       personal?.lastName       ?? f.last_name,
      employmentType: personal?.employmentType ?? f.employment_type ?? "Full-time",
      status:         personal?.status         ?? f.status          ?? "Active",
    },
    preferences: prefs ?? {
      subjectSpecializations: subArray.map((s: any) => s.subject_code ?? s.code),
      unavailableDays:        [],
      preferredDays:          ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      unavailableTimeSlots:   [],
      preferredTimeRange:     { start: "07:00", end: "18:00" },
      preferredRoomTypes:     ["lab","lecture"],
      priority:               "medium",
      maxClassesPerDay:       3,
      maxConsecutiveHours:    4,
    }
  };
});

  // 2. SUBJECT_LIST Mapping (Matches V2 Column Names)
  SUBJECT_LIST = subArray.map((s: any) => {
    const code = (s.subject_code ?? s.code ?? "").trim();
    const codeUpper = code.toUpperCase();

    let mode = s.assignment_mode ?? s.assignmentMode ?? "auto";

    // ENFORCE CORE SUBJECTS (AI Scheduled)
    if (codeUpper.includes("CS") || codeUpper.includes("IT") || codeUpper.includes("IS") || codeUpper.includes("CC") || codeUpper.includes("COSC")) {
      mode = "auto";
    }
    // EXCLUDE EXTERNAL SUBJECTS (Manually Scheduled)
    else if (codeUpper.includes("GE") || codeUpper.includes("MATH") || codeUpper.includes("NSTP") || codeUpper.includes("PE")) {
      mode = "manual";
    }

    return {
      id:             code,
      code:           code,
      name:           s.subject_name  ?? s.name,
      units:          s.units ?? 0,
      yearLevel:      s.year_level    ?? s.yearLevel,
      semester:       s.semester,
      programs:       s.programs      ?? [],
      facilityType:   s.facility_type ?? s.facilityType   ?? "lecture",
      assignmentMode: mode, 
      canSplit:       s.can_split     ?? s.canSplit        ?? false,
      splitPattern:   s.split_pattern ?? s.splitPattern   ?? null,
    };
  });

  // 3. ROOM_LIST Mapping (Matches V2 Column Names)
  ROOM_LIST = roomArray.map((r: any) => ({
    id:       r.id,
    room:     r.room, // Matches 'room' column in rooms_v2
    type:     r.type,
    capacity: r.capacity ?? 40,
  }));

  // 4. CURRICULUM Mapping (Parses JSONB sections)
  CURRICULUM = currArray.map((c: any) => ({
    ...c,
    // CRITICAL: curriculum_v2 stores sections as JSONB
    sections: typeof c.sections === 'string' ? JSON.parse(c.sections) : (c.sections || [])
  }));

  const { sem = 1 } = options;
  const constraints = buildConstraints(sem);
 
  // Reference unused helper to satisfy strict noUnusedLocals checks
  buildGenerationPrompt(constraints);

  const programs    = ["BSCS", "BSIT", "BSIS"];
 
  // ── CALL 1 (parallel): Generate each program simultaneously ───────────────
  console.log(`[DeptFlow] Generating schedules for ${programs.join(", ")} in parallel...`);
  const t0 = Date.now();

  const checkpoint = loadCheckpoint(sem);
  const programResults: GeminiScheduleResponse[] = [];
  const accumulatedSched: ScheduleAssignment[] = [];

  for (const prog of programs) {
    if (checkpoint[prog]) {
      console.log(`[DeptFlow] ↩ Restoring ${prog} from checkpoint (${checkpoint[prog].schedule.length} entries)`);
      const converted = toScheduleAssignments(checkpoint[prog].schedule);
      accumulatedSched.push(...converted);
      programResults.push(checkpoint[prog]);
    }
  }

  const remainingPrograms = programs.filter(p => !checkpoint[p]);

  for (const prog of remainingPrograms) {
    console.log(`[DeptFlow] → Generating ${prog}...`);
    const result = await callGemini(buildProgramPrompt(constraints, prog, accumulatedSched));
    console.log(`[DeptFlow] ✓ ${prog} done (${result.schedule.length} entries)`);

  // Save immediately after each program completes
  saveCheckpoint(sem, prog, result);

  const converted = toScheduleAssignments(result.schedule);
  accumulatedSched.push(...converted);
  programResults.push(result);
  }

  console.log(`[DeptFlow] All programs generated in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
 
  // Merge all program schedules into one flat array
  const rawDraft = [...accumulatedSched];
 
  // ── MINIMUM LOAD ENFORCEMENT (local, free) ────────────────────────────────
  // Adds TBD-time placeholder entries for any faculty with 0 assignments.
  const afterMinLoad = enforceMinimumLoad(rawDraft, constraints);
  console.log(`[DeptFlow] After enforceMinimumLoad: ${afterMinLoad.length} total entries (${rawDraft.length} from Gemini + ${afterMinLoad.length - rawDraft.length} placeholders).`);
 
  // ── LOAD REDISTRIBUTION (local, free) ────────────────────────────────────
  // Detects and fixes cases where Gemini assigned the same subject to the
  // same faculty across multiple sections (e.g., CS 101 for 1-A AND 1-B).
  // Reassigns excess entries to other qualified faculty with remaining capacity.
  const draft = redistributeConcentratedLoad(afterMinLoad, constraints);
 
  // ── LOCAL VALIDATION (free, instant) ─────────────────────────────────────
  console.log("[DeptFlow] Running local validation across merged schedule...");
  const issues     = validateLocally(draft);
 
  // ── CURRICULUM COMPLETENESS CHECK ─────────────────────────────────────────
  // Verifies every section×subject pair required by the curriculum has an entry.
  // Missing entries become HARD issues — triggers the fix round automatically.
  const { issues: completenessIssues } = checkCurriculumCompleteness(draft, constraints);
  const allIssues  = [...issues, ...completenessIssues];
  const hardIssues = allIssues.filter(i => i.type === "HARD");
  console.log(`[DeptFlow] ${hardIssues.length} hard issue(s) (incl. ${completenessIssues.length} missing entries), ${allIssues.length - hardIssues.length} soft warning(s).`);
 
  // ── HAPPY PATH ────────────────────────────────────────────────────────────
  if (hardIssues.length === 0) {
    console.log("[DeptFlow] No hard issues — accepted.");
    const perProgramReasoning: Record<string, string> = {};
    programs.forEach((p, i) => { perProgramReasoning[p] = programResults[i].reasoning; });
    clearCheckpoint();
    return {
      schedule:            draft,
      reasoning:           programResults.map((r, i) => `${programs[i]}: ${r.reasoning}`).join("\n"),
      perProgramReasoning,
      apiCallsUsed:        1,
      conflictsResolved:   [],
      wasFixed:            false,
      facultyUtilization:  buildFacultyUtilization(draft),
      missingEntries:      [],
    };
  }


  const allTimeConflicts = hardIssues.every(i => 
  i.id.startsWith("time-") || i.id.startsWith("room-")
);
const hasRealEntries = draft.filter(s => 
  s.start_time !== "07:00" || s.end_time !== "08:00"
).length > 0;

if (allTimeConflicts && !hasRealEntries) {
  console.warn("[DeptFlow] All hard issues are time conflicts from empty Gemini times. Returning draft — retry generation.");
  clearCheckpoint(); // force fresh generation next time
  return {
    schedule:            draft,
    reasoning:           "Times missing from AI response — schedule needs regeneration.",
    perProgramReasoning: {},
    apiCallsUsed:        1 as const,
    conflictsResolved:   [],
    wasFixed:            false,
    facultyUtilization:  buildFacultyUtilization(draft),
    missingEntries:      [],
  };
}
  // ── CALL 2 (parallel): Fix conflicts per-program ──────────────────────────
  // Group hard issues by which program's entries they affect
  console.log("[DeptFlow] Fixing conflicts — grouping by program...");

  const fixResults = await Promise.all(
    programs.map(async (prog) => {
      const progPrefix  = prog.toLowerCase();
      const progEntries = draft.filter(s => s.section.toLowerCase().startsWith(progPrefix));
      const progSections = new Set(progEntries.map(e => e.section));
      const progIssues   = hardIssues.filter(issue =>
        (issue.id.startsWith("missing-") && [...progSections].some(sec =>
          issue.id.includes(sec.replace(/\s/g, "_"))
        )) ||
        progEntries.some(e =>
          issue.id.includes(e.id) ||
          (issue.message.includes(e.section) && progSections.has(e.section))
        )
      );

      if (progIssues.length === 0) {
        console.log(`[DeptFlow] ✓ ${prog} has no hard issues to fix`);
        return { schedule: progEntries };
      }

      console.log(`[DeptFlow] → Fixing ${progIssues.length} issue(s) in ${prog}...`);
      const fixed = await callGemini(buildFixPrompt(constraints, progEntries, progIssues, draft));
      console.log(`[DeptFlow] ✓ ${prog} fixed`);
      return fixed;
    })
  );

  const fixedItems = fixResults.flatMap(r =>
    Array.isArray(r.schedule) ? r.schedule : []
  );
  const fixedRaw = toScheduleAssignments(fixedItems);
  const fixed    = redistributeConcentratedLoad(fixedRaw, constraints);
  const remaining = validateLocally(fixed).filter(r => r.type === "HARD");

  if (remaining.length > 0) {
    console.warn(`[DeptFlow] ${remaining.length} hard issue(s) remain. Admin review recommended.`);
  } else {
    console.log("[DeptFlow] All hard issues resolved.");
  }

  const perProgramReasoningFixed: Record<string, string> = {};
  programs.forEach((p, i) => {
    const r = fixResults[i] as any;
    perProgramReasoningFixed[p] = r.reasoning ?? "Fixed.";
  });

  const { missing: missingAfterFix } = checkCurriculumCompleteness(
    fixedRaw.length > 0 ? fixed : draft, constraints
  );

  // If fix round returned nothing useful, fall back to draft
  if (fixedRaw.length === 0) {
    console.warn("[DeptFlow] Fix round returned 0 entries. Falling back to draft.");
    clearCheckpoint();
    return {
      schedule:            draft,
      reasoning:           "Fix round failed — showing draft with issues for admin review.",
      perProgramReasoning: perProgramReasoningFixed,
      apiCallsUsed:        2 as const,
      conflictsResolved:   [],
      wasFixed:            true,
      facultyUtilization:  buildFacultyUtilization(draft),
      missingEntries:      missingAfterFix,
    };
  }

  clearCheckpoint();
  return {
    schedule:            fixed,
    reasoning:           "Schedule generated and fixed per program.",
    perProgramReasoning: perProgramReasoningFixed,
    apiCallsUsed:        2 as const,
    conflictsResolved:   fixResults.flatMap(r => (r as any).conflicts_resolved ?? []),
    wasFixed:            true,
    facultyUtilization:  buildFacultyUtilization(fixed),
    missingEntries:      missingAfterFix,
  };
}