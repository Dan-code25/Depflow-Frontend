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
    message: string;
  }[];
}

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const GEMINI_API_URL = `/api/gemini/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function enrichConflictsWithGemini(
  context: GeminiScheduleContext
): Promise<GeminiConflictSuggestion[]> {

  // Pre-filter: remove conflict types that Gemini should never touch because
  // they are either auto-fixed by the local engine or are valid by exception.
  // Passing them to Gemini risks getting back incorrect "suggestions".
  const filteredConflicts = context.detectedConflicts.filter(c => {
    // labhr-* conflicts are handled by a one-click local fix — no Gemini needed
    if (c.id.startsWith("labhr-")) return false;
    // nstp-day-* conflicts have a deterministic fix (→ Sunday) — skip Gemini
    if (c.id.startsWith("nstp-day-")) return false;
    // lablec-* conflicts have a deterministic fix (assign same faculty) — skip
    if (c.id.startsWith("lablec-")) return false;
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

  // Extract text from Gemini's response envelope
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!rawText) {
    console.warn("[DeptFlow] Gemini returned an empty response.");
    return [];
  }

  return parseGeminiResponse(rawText);
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(ctx: GeminiScheduleContext): string {
  // Extract only the entry IDs referenced in conflicts — avoids sending
  // 180+ schedule entries when only 4-6 are actually involved in conflicts.
  const involvedIds = new Set(
    ctx.detectedConflicts.flatMap(c => {
      // Pull IDs from conflict id strings like "time-id1|id2", "room-id1|id2"
      const match = c.id.match(/[a-z]+-(.+)/);
      if (!match) return [];
      return match[1].split("|");
    })
  );

  // Always include entries involved in conflicts; fall back to all if none matched
  const relevantSchedules = involvedIds.size > 0
    ? ctx.schedules.filter(s => involvedIds.has(s.id))
    : ctx.schedules;

  // Only include faculty who appear in relevant entries
  const involvedFacultyNames = new Set(relevantSchedules.map(s => s.facultyName));
  const relevantFaculty = ctx.faculty.filter(f => involvedFacultyNames.has(f.name));

  const facultyList = relevantFaculty
    .map(f => `${f.name}(${f.employmentType},${f.assignedUnits}/${f.maxUnits}u)`)
    .join(", ");

  const scheduleList = relevantSchedules
    .map(s => {
      // Tag lab subjects so Gemini knows their 2-hour clock rule
      const sub = ctx.subjects.find(x => x.code === s.subjectCode);
      const labTag = sub?.facilityType === "lab" ? "[LAB-2HRS]" : "";
      return `[${s.id}]${s.subjectCode}${labTag}|${s.facultyName}|${s.section}|${s.room}|${s.day} ${s.startTime}-${s.endTime}`;
    })
    .join("\n");

  const conflictList = ctx.detectedConflicts
    .map(c => `conflictId:"${c.id}"|${c.type}|"${c.label}": ${c.message}`)
    .join("\n");

  // Build a summary of subjects in the context so Gemini has facility type info
  const subjectLegend = ctx.subjects
    .filter(s => relevantSchedules.some(r => r.subjectCode === s.code))
    .map(s => `${s.code}(${s.units}u,${s.facilityType ?? "lecture"})`)
    .join(", ");

  return `
You are a schedule conflict advisor for TUP (Technological University of the Philippines).
Provide one actionable fix suggestion per conflict. Be specific — name faculty, subject codes, and times.

INVOLVED FACULTY: ${facultyList}

SUBJECT INFO (code|units|facilityType): ${subjectLegend}

INVOLVED SCHEDULE ENTRIES ([id]subjectCode[LAB-2HRS?]|faculty|section|room|day startTime-endTime):
${scheduleList}

CONFLICTS TO RESOLVE:
${conflictList}

─── CRITICAL EXCEPTION RULES ───────────────────────────────────────────────────
You MUST apply these rules when forming suggestions. Violating them produces bad advice.

1. LOAD LIMITS: Full-time faculty max = 21 units. Part-time max = 12 units.

2. FACILITY MATCH: Lab subjects must be in lab rooms. Lecture subjects in lecture rooms.
   Only assign faculty to subjects within their specialization.

3. LAB HOUR EXCEPTION (DO NOT flag as conflict):
   Lab subjects are 1 credit unit but require EXACTLY 2 clock hours of teaching.
   A lab entry showing 1 unit scheduled for 2 hours is CORRECT — do not suggest
   reducing it to 1 hour. If you see a lab entry with only 1 clock hour, suggest
   extending it to 2 hours.

4. NSTP SUNDAY RULE (DO NOT flag as conflict):
   NSTP subjects are ALWAYS scheduled on Sunday. A Sunday schedule for NSTP is
   intentional and correct — never suggest moving NSTP to a weekday.
   Sunday is a valid teaching day for NSTP only.

5. LAB-LEC PAIRING (DO NOT flag as conflict):
   If a section has both a Lab variant and a Lecture variant of the same subject
   (e.g. "Web Dev Lab" + "Web Dev Lec" for the same section), they MUST be taught
   by the SAME faculty member to combine into full credit units (e.g. 3 units total).
   Having the same professor teach both the Lab and Lec is the CORRECT and REQUIRED
   state — never suggest splitting them to different faculty.

6. LAB SPLIT SESSIONS (DO NOT flag as conflict):
   A lab subject may be split into two separate time blocks on different days
   (e.g. 1 hr Monday + 1 hr Wednesday = 2 clock hours total). This is valid.
   Do not flag split lab sessions as a time conflict if they are on different days.

7. THREE-STAGE WORKFLOW: Schedules pass through Draft → Finalized → Published.
   Only Draft and Finalized entries need conflict resolution. Published entries
   are locked and should not be suggested for changes.
─────────────────────────────────────────────────────────────────────────────────

Return ONLY a valid JSON array — no markdown, no extra text:
[{"conflictId":"<exact id from CONFLICTS list>","suggestion":"<specific fix, 2 sentences max>","summaryNote":"<1 sentence summary>"}]
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