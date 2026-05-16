// ─────────────────────────────────────────────────────────────────────────────
// geminiSchedule.ts
//
// Gemini-powered conflict enrichment for DeptFlow scheduling.
//
// ALIGNMENT NOTE — this file shares the same rule-set as geminiSchedHelper.ts.
// Any rule added there must be mirrored here so that Gemini never flags a
// "conflict" that the scheduler intentionally produced under an exception rule.
//
// EXCEPTIONS (must NOT be treated as conflicts):
//   ✓ Lab subjects → 1 credit unit but 2 clock hours of teaching time
//   ✓ NSTP subjects → always scheduled on Sunday (not Mon-Sat)
//   ✓ Lab-Lec pairs → Lab and its matching Lecture for the same section
//       MUST share the same faculty — this is the correct state, not a conflict
//   ✓ Lab sessions → MAY be split across two separate time blocks / days
//   ✓ Sunday → valid teaching day (for NSTP only)

import type { ScheduleAssignment } from "./geminiSchedHelper";
import { isExternalSubject } from "./scheduleConflict";
// ─────────────────────────────────────────────────────────────────────────────
export interface GeminiConflictSuggestion {
  conflictId: string;
  suggestion: string;
  summaryNote?: string;
}
export interface GeminiScheduleContext {
  faculty: {
    id: string;
    name: string;
    employmentType: string;
    maxUnits: number;
    assignedUnits: number;
    specializations: string[]; // List of subject codes this faculty can teach (if empty or missing, can teach all)
  }[];
  subjects: {
    id: string;
    code: string;
    name: string;
    units: number;
    facilityType?: string; // "lab" | "lecture" — needed for lab-hour exception
  }[];
  schedules: {
    id: string;
    facultyName: string;
    subjectCode: string;
    subjectName: string;
    section: string;
    room: string;
    day: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
  detectedConflicts: {
    id: string;
    type: "HARD" | "SOFT";
    label: string;
    affected: string[];
    message: string;
  }[];
}

export interface ValidationContext extends GeminiScheduleContext {
    allSchedules: ScheduleAssignment[];
    allFaculty: Array<{
    id: string;
    personal: {
      first_name: string;
      last_name: string;
      employmentType: string;
    };
    preferences?: {
      subjectSpecializations?: string[];
      unavailableDays?: string[];
      unavailableTimeSlots?: string[];
    };
  }>;
  allSubjects: Array<{
    id: string;
    code: string;
    units: number;
    facilityType?: string;
  }>;
}


const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL;

export async function enrichConflictsWithGemini(
  context: GeminiScheduleContext,
  validationContext?: ValidationContext
): Promise<GeminiConflictSuggestion[]> {

  // Pre-filter: remove conflict types that Gemini should never touch because
  // they are either auto-fixed by the local engine or are valid by exception.
  // Passing them to Gemini risks getting back incorrect "suggestions".
  const filteredConflicts = context.detectedConflicts.filter(c => {
    // Check if any affected assignment involves an external subject (GE/PE/NSTP)
    const involvesExternal = c.affected.some((id: string) => { // 🚩 FIX: Added explicit string type
      const assignment = context.schedules.find(s => s.id === id);
      return assignment && isExternalSubject(assignment.subjectCode);
    });

    if (involvesExternal) return false;

    // Filter out conflicts already handled by deterministic local fixes
    // 🚩 FIX: Changed 'prefix' to 'pre' to match the iterator variable
    if (["labhr-", "nstp-day-", "lablec-", "room-", "time-", "tbd-fac-", "tbd-room-"].some((pre: string) => c.id.startsWith(pre))) {
      return false;
    }
    
    return true;
  });

  const enrichContext: GeminiScheduleContext = {
    ...context,
    detectedConflicts: filteredConflicts,
  };

  const prompt = buildPrompt(enrichContext);

  const response = await fetch(BACKEND_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt,
      isJsonMode: false // Tells backend we want text formatting
    }),
  });


  const data = await response.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const suggestions = parseGeminiResponse(rawText);


  // ── NEW: Pre-flight validation (Phase 2) ────────────────────────────────
  if (validationContext) {
    const validated = suggestions.filter(sugg => validateSuggestion(sugg, validationContext));
    return validated;
  }

  return suggestions;
}


// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(ctx: GeminiScheduleContext): string {
  // Extract only the entry IDs referenced in conflicts
  const relevantSchedules = ctx.schedules;
  const facultyList = ctx.faculty
    .map(f => `${f.name}(${f.employmentType},${f.assignedUnits}/${f.maxUnits}u)`)
    .join(", ");

  const scheduleList = relevantSchedules
    .map(s => {
      const sub = ctx.subjects.find(x => x.code === s.subjectCode);
      const labTag = sub?.facilityType === "lab" ? "[LAB-2HRS]" : "";
      return `[${s.id}]${s.subjectCode}${labTag}|${s.facultyName}|${s.section}|${s.room}|${s.day} ${s.startTime}-${s.endTime}`;
    })
    .join("\n");

  const subjectLegend = ctx.subjects
    .filter(s => relevantSchedules.some(r => r.subjectCode === s.code))
    .map(s => `${s.code}(${s.units}u,${s.facilityType ?? "lecture"})`)
    .join(", ");

  const facultySpecializationList = ctx.faculty
    .map(f => {
    const specs = f.specializations || [];
    return `${f.name} (${f.employmentType}, ${f.assignedUnits}/${f.maxUnits}u): [${specs.join(", ")}]`;
    })
    .join("\n");

  const facultyTeachingMap = new Map<string, Set<string>>();
    ctx.schedules.forEach(s => {
      if (!facultyTeachingMap.has(s.facultyName)) {
        facultyTeachingMap.set(s.facultyName, new Set());
      }
      facultyTeachingMap.get(s.facultyName)!.add(s.subjectCode);
    });

  const currentlyAssignedSubjects = Array.from(facultyTeachingMap.entries())
    .map(([facultyName, subjects]) => `${facultyName}: [${Array.from(subjects).join(", ")}]`)
    .join("\n");

 
  // ── PHASE 3: NEW FOCUSED PROMPT ────────────────────────────────────────
  const finalPrompt = `
    You are the Master AI Load Advisor for a University Department at TUP.
    Your SINGLE responsibility is to suggest intelligent faculty load rebalancing based on specializations.
    You will NOT fill unassigned subjects. You will NOT resolve conflicts.
    You will ONLY provide proactive load balancing suggestions.
    ═══════════════════════════════════════════════════════════════════════════════
    CURRENT STATE:
    Faculty Load Status: ${facultyList}
    Faculty Subject Specializations:
    ${facultySpecializationList}
    Subject Info (code|units|type): ${subjectLegend}
    Currently Assigned Schedules:
    ${scheduleList}
    CURRENTLY ASSIGNED SUBJECTS BY FACULTY:
    ${currentlyAssignedSubjects}
    ═══════════════════════════════════════════════════════════════════════════════
    ⚠️ CRITICAL DIRECTION RULES (READ CAREFULLY):

    YOU MUST TRANSFER WORK FROM OVERLOADED TO UNDERLOADED.
    NEVER transfer work FROM underloaded TO more underloaded.

    You can ONLY suggest transferring subjects that appear in the "CURRENTLY ASSIGNED SUBJECTS BY FACULTY" list.
    Do NOT suggest transferring subjects that are not scheduled.
    Do NOT suggest subjects based on specializations alone - they must be actually taught.
    
    SOURCE (take work FROM here): Faculty at ≥ 85% load
    - Juan Dela Cruz (21/21u = 100%) ← GIVE AWAY work
    - Jevon Mackie Castro (21/21u = 100%) ← GIVE AWAY work
    - Dan Jheniel Bringas (20/21u = 95%) ← GIVE AWAY work

    DESTINATION (give work TO here): Faculty at < 50% load
    - Jan Eilbert Lee (0/12u = 0%) ← RECEIVE work
    - Dolores Montesines (6/21u = 28%) ← RECEIVE work
    - Peragrino Amador (6/21u = 28%) ← RECEIVE work

    WRONG DIRECTION (DO NOT DO THIS):
    ❌ Taking from Peragrino (6/21u = 28% UNDERLOADED) and giving to Jan (0/12u = 0% MORE UNDERLOADED)
    ❌ This makes Peragrino WORSE and wastes Jan's capacity on someone else's subjects
    ❌ YOU WILL BE REJECTED IF YOU DO THIS
    ═══════════════════════════════════════════════════════════════════════════════
    ▶️ YOUR RESPONSIBILITY: INTELLIGENT LOAD BALANCING (SKILL-BASED TRANSFERS)

    GOAL:
    Find faculty who are OVERLOADED (at or near their maximum load).
    Take ONE of their subjects.
    Give it to an UNDERLOADED faculty member who can teach it.

    THE ALGORITHM (UNIDIRECTIONAL):

    STEP 1 - FIND SOURCE (OVERLOADED):
    Look for faculty at ≥ 85% load:
    - Juan Dela Cruz (21/21u) ← TAKE FROM HERE
    - Jevon Mackie Castro (21/21u) ← TAKE FROM HERE
    - Dan Jheniel Bringas (20/21u) ← TAKE FROM HERE
    - Fernando Renegado (18/21u) ← TAKE FROM HERE
    - Darwin Vargas (18/21u) ← TAKE FROM HERE
    - Priscilla Bator (18/21u) ← TAKE FROM HERE
    - John Lennon (19/21u) ← TAKE FROM HERE

    STEP 2 - PICK A SUBJECT FROM OVERLOADED:
    Choose ONE subject this overloaded faculty teaches.

    STEP 3 - FIND DESTINATION (UNDERLOADED):
    Look for faculty at < 50% load:
    - Jan Eilbert Lee (0/12u) ← GIVE TO HERE
    - Dolores Montesines (6/21u) ← GIVE TO HERE
    - Peragrino Amador (6/21u) ← GIVE TO HERE
    - Francis Dela Cruz (6/12u) ← GIVE TO HERE
    - Maria Carmela Francisco (6/12u) ← GIVE TO HERE

    STEP 4 - CHECK SKILL MATCH:
    Does the DESTINATION faculty have the subject in their specializations?
    If yes → VALID transfer
    If no → SKIP this pairing, try a different subject or destination

    STEP 5 - CHECK CAPACITY:
    Can DESTINATION faculty take this subject without exceeding their max?
    If yes → VALID transfer
    If no → SKIP, try a different subject

    STEP 6 - SUGGEST THE TRANSFER:
    "Transfer X FROM overloaded-faculty (at 21/21u) TO underloaded-faculty (at 0/12u)"
    Result: overloaded-faculty drops to lower load, underloaded-faculty gains work
    ═══════════════════════════════════════════════════════════════════════════════
    COMPREHENSIVE APPROACH:

    You have 7 overloaded faculty members and 5 underloaded faculty members.
    Your goal is to find and suggest MULTIPLE TRANSFERS (5-15 suggestions minimum).

    For each overloaded faculty member, explore:
    1. All their subjects
    2. All possible underloaded recipients who can teach them
    3. Generate multiple transfer options

    Example:
    - Juan (21/21u) teaches 5 subjects → Could transfer any of those 5 to different recipients
    - Darwin (18/21u) teaches 3 subjects → Could transfer to multiple recipients
    - Each subject might fit multiple underloaded faculty members

    Do NOT stop at 1-2 suggestions. Explore the full matrix of possibilities.
    ═══════════════════════════════════════════════════════════════════════════════
    EXAMPLES OF CORRECT DIRECTION:

    ✅ CORRECT:
    Transfer CC101-M (3u) FROM Juan Dela Cruz (21/21u - OVERLOADED) 
                        TO Jan Eilbert Lee (0/12u - UNDERLOADED)
    Result: Juan 18/21u, Jan 3/12u ✓ (overloaded faculty relieved, underloaded faculty balanced)

    ✅ CORRECT:
    Transfer IT241L-M (3u) FROM Jevon Mackie Castro (21/21u - OVERLOADED)
                          TO Dolores Montesines (6/21u - UNDERLOADED)
    Result: Jevon 18/21u, Dolores 9/21u ✓ (both moving toward balance)

    ❌ WRONG (DO NOT OUTPUT):
    Transfer CC101-M (3u) FROM Peragrino Amador (6/21u - UNDERLOADED)
                        TO Jan Eilbert Lee (0/12u - EVEN MORE UNDERLOADED)
    Result: Peragrino 3/21u (worse!), Jan 3/12u (defeats purpose) ✗

    ❌ WRONG (DO NOT OUTPUT):
    Transfer IT241L-M (3u) FROM Dolores Montesines (6/21u - UNDERLOADED)
                          TO Jan Eilbert Lee (0/12u - EVEN MORE UNDERLOADED)
    Result: Dolores 3/21u (worse!), Jan 3/12u ✗
    ═══════════════════════════════════════════════════════════════════════════════
    CRITICAL VALIDATION:

    Before EVERY suggestion, verify:
    1. SOURCE faculty is at ≥ 85% load (overloaded, at or near max)
    2. DESTINATION faculty is at < 50% load (underloaded, has room)
    3. SOURCE load > DESTINATION load (moving FROM high TO low)
    4. DESTINATION has the subject in specializations
    5. DESTINATION has capacity after receiving the subject

    If ANY of these is false, DO NOT output that suggestion.
    ═══════════════════════════════════════════════════════════════════════════════
   RESPONSE FORMAT (MUST PROVIDE COMPREHENSIVE LIST):

    Return ONLY a valid JSON array with MULTIPLE suggestions (minimum 5-10).
    Do not wrap in markdown. Each suggestion MUST have all three fields.

    [
      {
        "conflictId": "load-advice-001",
        "suggestion": "...",
        "summaryNote": "..."
      },
      {
        "conflictId": "load-advice-002",
        "suggestion": "...",
        "summaryNote": "..."
      },
      {
        "conflictId": "load-advice-003",
        "suggestion": "...",
        "summaryNote": "..."
      },
      ... (more suggestions) ...
    ]

    MINIMUM: 5 suggestions
    EXPECTED: 10-15 suggestions if multiple valid transfers exist
    DO NOT output fewer than 5 suggestions.
    ═══════════════════════════════════════════════════════════════════════════════`;
  return finalPrompt.trim();
}

// ── Response parser ───────────────────────────────────────────────────────────

function parseGeminiResponse(raw: string): GeminiConflictSuggestion[] {
  try {
    // Strip markdown fences if Gemini ignores responseMimeType
    const clean = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed)) {
      console.warn("[DeptFlow] Gemini response was not an array:", parsed);
      return [];
    }

    // Validate shape of each item
    return parsed.filter(
      (item): item is GeminiConflictSuggestion =>
        typeof item === "object" &&
        item !== null &&
        typeof item.conflictId === "string" &&
        typeof item.suggestion === "string"
    );
  } catch (err) {
    console.error("[DeptFlow] Failed to parse Gemini response:", err, "\nRaw:", raw);
    return [];
  }
}

function validateSuggestion(
  suggestion: GeminiConflictSuggestion,
  vCtx: ValidationContext
): boolean {
  if (!vCtx) return true;

  console.log(`[DeptFlow] Validating suggestion for conflict: ${suggestion.conflictId}`);

  const suggestionText = suggestion.suggestion.toLowerCase();

  // 🛠️ FIXED: Made the "(3u)" unit string optional so the parser doesn't break
  // if Gemini forgets to include it.
  const facultyReassignmentMatch = suggestionText.match(
    /transfer\s+([a-zA-Z0-9-]+)(?:\s*\(\d+u\))?\s+from\s+(.+?)\s+to\s+(.+?)(?:\.|,|$)/i
  );

  if (facultyReassignmentMatch) {
    let subjectCode = facultyReassignmentMatch[1].toUpperCase();
    subjectCode = subjectCode
      .replace(/([A-Z]+\d+)l(-m)$/i, '$1L$2')  
      .replace(/([A-Z]+\d+)l(-h)$/i, '$1L$2')  
      .toUpperCase();
    
    // 🛠️ FIXED: Shifted from index 4 to index 3 based on the new regex structure
    const targetName = facultyReassignmentMatch[3]
      .split('(')[0]
      .trim()
      .toLowerCase();
      
    const targetFaculty = vCtx.allFaculty.find(
      f => `${f.personal.first_name} ${f.personal.last_name}`.toLowerCase().includes(targetName)
    );

    if (!targetFaculty) {
      console.warn(`[DeptFlow] ✗ Suggested faculty not found: ${targetName}`);
      return false;
    }

    const subject = vCtx.allSubjects.find(s => s.code === subjectCode);
    if (!subject) {
      console.warn(`[DeptFlow] ✗ Subject not found: ${subjectCode}`);
      return false;
    }

    const targetPrefs = targetFaculty.preferences ?? {};
    const canTeach = !targetPrefs.subjectSpecializations ||
      targetPrefs.subjectSpecializations.length === 0 ||
      targetPrefs.subjectSpecializations.includes(subject.id);

    if (!canTeach && targetPrefs.subjectSpecializations && targetPrefs.subjectSpecializations.length > 0) {
      console.warn(
        `[DeptFlow] ✗ ${targetFaculty.personal.first_name} ${targetFaculty.personal.last_name} ` +
        `cannot teach ${subjectCode}`
      );
      return false;
    }

    const currentLoad = vCtx.allSchedules
      .filter(s => s.faculty_id === targetFaculty.id && s.day !== "TBD")
      .filter((s, _, arr) => {
        if (!s.session_group_id) return true;
        return arr.findIndex(x => x.session_group_id === s.session_group_id) === arr.indexOf(s);
      })
      .reduce((sum, s) => {
        const subj = vCtx.allSubjects.find(x => x.id === s.subject_id);
        return sum + (subj?.units ?? 0);
      }, 0);

    const maxLoad = targetFaculty.personal.employmentType === "Part-Time" ? 12 : 21;
    const projectedLoad = currentLoad + (subject.units ?? 0);

    if (projectedLoad > maxLoad) {
      console.warn(
        `[DeptFlow] ✗ ${targetFaculty.personal.first_name} ${targetFaculty.personal.last_name} ` +
        `would exceed capacity: ${projectedLoad}/${maxLoad}u`
      );
      return false;
    }

    console.log(`[DeptFlow] ✓ Suggestion valid!`);
    return true;
  }

  const timeRoomMatch = suggestionText.match(/(?:move|change|schedule|assign).*(?:to|on)\s+(.+?)(?:\.|,|$)/i);
  if (timeRoomMatch) {
    const targetSlot = timeRoomMatch[1].trim();
    console.log(`[DeptFlow] ✓ Time/room suggestion accepted: ${targetSlot}`);
    return true;
  }

  console.warn(`[DeptFlow] ✗ Could not parse actionable suggestion: ${suggestion.suggestion}`);
  return false;
}

export async function validateFullScheduleAdherence(context: GeminiScheduleContext): Promise<string> {
  const hardConflicts = context.detectedConflicts.filter(c => c.type === "HARD");
  const softConflicts = context.detectedConflicts.filter(c => c.type === "SOFT");

  // Extract exactly what error LABELS exist, so the AI knows strictly what categories to write about
  const existingHardLabels = [...new Set(hardConflicts.map(c => c.label))];
  const existingSoftLabels = [...new Set(softConflicts.map(c => c.label))];

  const prompt = `
    You are the University Head Auditor writing an Executive Summary on schedule compliance.
    
    A deterministic math engine has scanned the schedule. You must summarize ONLY the data provided below. 
    
    CATEGORIES OF HARD VIOLATIONS FOUND:
    ${existingHardLabels.length === 0 ? "None." : existingHardLabels.join(", ")}
    
    DETAILED HARD VIOLATIONS:
    ${hardConflicts.length === 0 ? "None." : hardConflicts.map(c => `- [${c.label}] ${c.message}`).join("\n")}
    
    CATEGORIES OF SOFT WARNINGS FOUND:
    ${existingSoftLabels.length === 0 ? "None." : existingSoftLabels.join(", ")}
    
    DETAILED SOFT WARNINGS:
    ${softConflicts.length === 0 ? "None." : softConflicts.map(c => `- [${c.label}] ${c.message}`).join("\n")}
    
    STRICT WRITING RULES:
    1. Organize your summary using ONLY the categories explicitly listed above.
    2. DO NOT mention, define, or invent any conflict categories that are not listed.
    3. If a category is missing (e.g., if there are no "Room Double-Bookings" listed), DO NOT mention it at all.
    4. Keep the tone professional, authoritative, and concise. Group similar errors together rather than listing every single one.
  `;

  const response = await fetch(BACKEND_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt,
      isJsonMode: false // Tells backend we want text formatting
    }),
  });

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Could not generate audit report.";
}