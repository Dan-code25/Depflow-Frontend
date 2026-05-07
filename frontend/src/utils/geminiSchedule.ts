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
      firstName: string;
      lastName: string;
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
const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_API_URL = `/api/gemini/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
    if (["labhr-", "nstp-day-", "lablec-", "room-", "time-"].some((pre: string) => c.id.startsWith(pre))) {
      return false;
    }
    
    return true;
  });

  // Nothing left to enrich after filtering
  if (filteredConflicts.length === 0) return [];

  const enrichContext: GeminiScheduleContext = {
    ...context,
    detectedConflicts: filteredConflicts,
  };

  const prompt = buildPrompt(enrichContext);

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        // Force JSON output — supported by Gemini 2.0 Flash
        responseMimeType: "application/json",
        temperature: 0.3,      // Low temp = consistent, factual suggestions
        maxOutputTokens: 8192, // Must be high — conflict IDs contain full Date.now()
                               // timestamps (19-char strings). With 4+ conflicts and
                               // long suggestions, 4096 can still truncate. 8192 is safe.
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!rawText) {
    console.warn("[DeptFlow] Gemini returned an empty response.");
    return [];
  }

  const suggestions = parseGeminiResponse(rawText);

  // ── NEW: Pre-flight validation (Phase 2) ────────────────────────────────
  if (validationContext) {
    const validated = suggestions.filter(sugg => validateSuggestion(sugg, validationContext));
    console.log(
      `[DeptFlow] Validated ${validated.length}/${suggestions.length} suggestions ` +
      `(filtered ${suggestions.length - validated.length} invalid ones)`
    );
    return validated;
  }

  return suggestions;
}


// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(ctx: GeminiScheduleContext): string {
  // Extract only the entry IDs referenced in conflicts
  const involvedIds = new Set(
    ctx.detectedConflicts.flatMap(c => {
      const match = c.id.match(/[a-z]+-(.+)/);
      if (!match) return [];
      return match[1].split("|");
    })
  );

  const relevantSchedules = involvedIds.size > 0
    ? ctx.schedules.filter(s => involvedIds.has(s.id))
    : ctx.schedules;

  const involvedFacultyNames = new Set(relevantSchedules.map(s => s.facultyName));
  const relevantFaculty = ctx.faculty.filter(f => involvedFacultyNames.has(f.name));

  const facultyList = relevantFaculty
    .map(f => `${f.name}(${f.employmentType},${f.assignedUnits}/${f.maxUnits}u)`)
    .join(", ");

  const scheduleList = relevantSchedules
    .map(s => {
      const sub = ctx.subjects.find(x => x.code === s.subjectCode);
      const labTag = sub?.facilityType === "lab" ? "[LAB-2HRS]" : "";
      return `[${s.id}]${s.subjectCode}${labTag}|${s.facultyName}|${s.section}|${s.room}|${s.day} ${s.startTime}-${s.endTime}`;
    })
    .join("\n");

  const conflictList = ctx.detectedConflicts
    .map(c => `conflictId:"${c.id}"|${c.type}|"${c.label}": ${c.message}`)
    .join("\n");

  const subjectLegend = ctx.subjects
    .filter(s => relevantSchedules.some(r => r.subjectCode === s.code))
    .map(s => `${s.code}(${s.units}u,${s.facilityType ?? "lecture"})`)
    .join(", ");

  // ── PHASE 3: NEW FOCUSED PROMPT ────────────────────────────────────────
  return `
You are a faculty REASSIGNMENT advisor for TUP (Technological University of the Philippines).

YOUR SOLE JOB: Suggest which overloaded faculty should transfer their subjects to other faculty.

⚠️ CRITICAL: You are NOT responsible for schedule detection, room changes, or time changes.
The frontend has already detected all conflicts. Your job is ONLY to suggest reassignments.

═══════════════════════════════════════════════════════════════════════════════

CURRENT STATE:

Faculty Load Status: ${facultyList}

Subject Info (code|units|type): ${subjectLegend}

Current Schedules:
${scheduleList}

CONFLICTS DETECTED (by frontend):
${conflictList}

═══════════════════════════════════════════════════════════════════════════════

YOUR TASK:

For EACH overload conflict (type="HARD"), suggest ONE faculty reassignment:
  1. Name the overloaded faculty member
  2. Name the subject they should transfer (specific code like CS211L-M)
  3. Name the TARGET faculty (specific first+last name) who should take it
  4. Verify your suggestion works by checking:
     - Target faculty exists in the list above
     - Target faculty is not already overloaded
     - Target faculty's load + subject units ≤ their max

═══════════════════════════════════════════════════════════════════════════════

RULES (MUST FOLLOW):

1. LOAD LIMITS: Full-time max = 21u, Part-time max = 12u
   Only suggest transfers TO faculty with available capacity.

2. FACULTY NAMES: Use EXACT names from the "Faculty Load Status" list above.
   Example: "Darwin Vargas" NOT "another faculty member"
   Example: "Dr. Santos" NOT "an underloaded professor"

3. ONLY REASSIGNMENTS: Suggest ONLY faculty transfers. Do NOT suggest:
   ✗ Time/day changes (frontend handles these)
   ✗ Room changes (frontend handles these)
   ✗ Schedule restructuring (frontend handles these)
   ✓ ONLY: "Move subject X from Faculty A to Faculty B"

4. VERIFICATION REQUIRED: For each suggestion, show why it works:
   Example: "Transfer CS211L-M (3u) from Dan Dandan (25/21u) to Darwin Vargas (14/21u).
            Dan becomes 22/21u (still overloaded but better). Darwin becomes 17/21u (okay)."

5. ONE FACULTY AT A TIME: If a faculty is overloaded by 4 units, suggest ONE transfer.
   Don't suggest transferring 2+ subjects in one suggestion.

6. NO SPECULATION: Only suggest transfers between faculty ACTUALLY listed above.
   Don't invent new faculty or suggest unrealistic transfers.

═══════════════════════════════════════════════════════════════════════════════

RESPONSE FORMAT (MUST BE EXACTLY THIS):

Return ONLY a valid JSON array — no markdown, no extra text:

[
  {
    "conflictId": "<exact id from CONFLICTS list above>",
    "suggestion": "<specific reassignment only>. Transfer <SUBJECT_CODE> (Xu) from <Current Faculty> to <Target Faculty Name>. Verification: <Current Faculty> becomes X/Zu, <Target Faculty> becomes Y/Zu.",
    "summaryNote": "<1 sentence summary of the transfer>"
  }
]

EXAMPLES OF GOOD SUGGESTIONS:
✓ "Transfer CS251L-M (1u) from Dan Dandan (25/21u) to Darwin Vargas (14/21u)"
✓ "Move IS213-M (3u) from Dan Dandan to Dr. Reyes who has capacity (17/21u)"

EXAMPLES OF BAD SUGGESTIONS (DO NOT DO THESE):
✗ "Move the class to another day"
✗ "Schedule in a different room"
✗ "Consider assigning to an available faculty"
✗ "Move to another faculty member" (no name!)
✗ "Transfer to another professor" (which professor?!)

═══════════════════════════════════════════════════════════════════════════════
`.trim();
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
  // If no validation context provided, skip validation (backward compatible)
  if (!vCtx) return true;

  console.log(`[DeptFlow] Validating suggestion for conflict: ${suggestion.conflictId}`);

  // Parse the suggestion text to extract the action
  const suggestionText = suggestion.suggestion.toLowerCase();

  // ── VALIDATION RULE 1: Faculty reassignment suggestions ──────────────────
  // Pattern: "move X to Dr. Y" or "assign X to Dr. Y" or "transfer X to Dr. Y"
  const facultyReassignmentMatch = suggestionText.match(
    /transfer\s+(\w+(?:-\w+)?)\s+\((\d+)u\)\s+from\s+(.+?)\s+to\s+(.+?)(?:\.|,|$)/i
  );

  if (facultyReassignmentMatch) {
    let subjectCode = facultyReassignmentMatch[1].toUpperCase();
  // Handle common patterns: cs251l-m → CS251L-M
    subjectCode = subjectCode
      .replace(/([A-Z]+\d+)l(-m)$/i, '$1L$2')  // xxx...l-m → xxxL-M
      .replace(/([A-Z]+\d+)l(-h)$/i, '$1L$2')  // xxx...l-h → xxxL-H
      .toUpperCase();
    
    const targetName = facultyReassignmentMatch[4]
      .split('(')[0]
      .trim()
      .toLowerCase();
    const targetFaculty = vCtx.allFaculty.find(
      f => `${f.personal.firstName} ${f.personal.lastName}`.toLowerCase().includes(targetName.toLowerCase())
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

    // CHECK 1: Can the target faculty teach this subject?
    const targetPrefs = targetFaculty.preferences ?? {};
    const canTeach = !targetPrefs.subjectSpecializations ||
      targetPrefs.subjectSpecializations.length === 0 ||
      targetPrefs.subjectSpecializations.includes(subject.id);

    if (!canTeach && targetPrefs.subjectSpecializations && targetPrefs.subjectSpecializations.length > 0) {
      console.warn(
        `[DeptFlow] ✗ ${targetFaculty.personal.firstName} ${targetFaculty.personal.lastName} ` +
        `cannot teach ${subjectCode} (specializations: ${targetPrefs.subjectSpecializations.join(", ")})`
      );
      return false;
    }

    // CHECK 2: Does target faculty have capacity?
    const currentLoad = vCtx.allSchedules
      .filter(s => s.faculty_id === targetFaculty.id && s.day !== "TBD")
      .filter((s, _, arr) => {
        // For split sessions, count only once
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
        `[DeptFlow] ✗ ${targetFaculty.personal.firstName} ${targetFaculty.personal.lastName} ` +
        `would exceed capacity: ${projectedLoad}/${maxLoad}u (adding ${subject.units}u to current ${currentLoad}u)`
      );
      return false;
    }

    console.log(
      `[DeptFlow] ✓ Suggestion valid: ${targetFaculty.personal.firstName} ${targetFaculty.personal.lastName} ` +
      `can take ${subjectCode} (capacity: ${projectedLoad}/${maxLoad}u)`
    );
    return true;
  }

  // ── VALIDATION RULE 2: Time/Room change suggestions ──────────────────────
  const timeRoomMatch = suggestionText.match(/(?:move|change|schedule|assign).*(?:to|on)\s+(.+?)(?:\.|,|$)/i);
  if (timeRoomMatch) {
    const targetSlot = timeRoomMatch[1].trim();
    console.log(`[DeptFlow] ✓ Time/room suggestion accepted: ${targetSlot}`);
    return true;
  }

  // ── VALIDATION RULE 3: Generic suggestions (no specific action detected) ──
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

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }, 
    }),
  });

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Could not generate audit report.";
}