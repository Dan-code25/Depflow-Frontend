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

  const prompt = buildPrompt(context);

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
    .map(s => `[${s.id}]${s.subjectCode}|${s.facultyName}|${s.section}|${s.room}|${s.day} ${s.startTime}-${s.endTime}`)
    .join("\n");

  const conflictList = ctx.detectedConflicts
    .map(c => `conflictId:"${c.id}"|${c.type}|"${c.label}": ${c.message}`)
    .join("\n");

  return `
You are a schedule conflict advisor for TUP (Philippines).
Provide one fix suggestion per conflict. Be specific — name faculty, subject codes, times.

INVOLVED FACULTY: ${facultyList}

INVOLVED SCHEDULE ENTRIES:
${scheduleList}

CONFLICTS:
${conflictList}

RULES: Full-time max 21u, part-time max 12u. Lab subjects need lab rooms. Only assign faculty their specializations. Respect unavailable days/slots.

Return ONLY a JSON array — no markdown:
[{"conflictId":"<exact id>","suggestion":"<2 sentences max>","summaryNote":"<1 sentence>"}]
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