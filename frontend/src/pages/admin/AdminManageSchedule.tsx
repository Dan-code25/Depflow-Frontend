// ─────────────────────────────────────────────────────────────────────────────
// AdminManageSchedule.tsx  ·  pages/admin
// State, data-fetching, and event handlers only.
// All UI is delegated to components/admin/schedule/*.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from "react";
import { BookOpen, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

import { AdminLayout } from "../../components/layout/AdminLayout";
import api from "../../services/api";

// Schedule-specific components
import { SchedulePageHeader }    from "../../components/manageschedule/SchedulePageHeader";
import { ScheduleStatCard }      from "../../components/manageschedule/ScheduleStatCard";
import { ScheduleFilterBar }     from "../../components/manageschedule/ScheduleFilterBar";
import { ScheduleListView }      from "../../components/manageschedule/ScheduleListView";
import { ScheduleTimetableView } from "../../components/manageschedule/ScheduleTimetableView";
import { LoadMonitorPanel }      from "../../components/manageschedule/LoadMonitorPanel";
import { ScheduleFormModal }     from "../../components/manageschedule/ScheduleFormModal";
import { ScheduleDeleteModal }   from "../../components/manageschedule/ScheduleDeleteModal";
import { ConflictScanModal }     from "../../components/manageschedule/ConflictScanModal";
import { AutoFixResultsModal }   from "../../components/manageschedule/AutoFixResultsModal";
import { SetupSectionsModal }    from "../../components/manageschedule/SetupSectionsModal";
import { AIAdvisorModal }        from "../../components/manageschedule/AIAdvisorModal";
import { AuditModal }            from "../../components/manageschedule/AuditModal";
import {
  ScheduleDraftBanner,
  ScheduleFinalizedBanner,
  ScheduleUnresolvedBanner,
} from "../../components/manageschedule/ScheduleBanners";

// Utils & services
import {
  enrichConflictsWithGemini,
  type ValidationContext,
  validateFullScheduleAdherence,
} from "../../utils/geminiSchedule";
import {
  generateSchedule,
  type ScheduleAssignment,
} from "../../utils/geminiSchedHelper";
import {
  type ScheduleStatus,
  type Conflict,
  type ConflictTransfer,
  FACULTY_LIST,
  SUBJECT_LIST,
  ROOM_LIST,
  getSubject,
  getRoom,
  buildGeminiContext,
  runConflictScan,
  categorizeByFixability,
  resolveConflictsDeterministically,
  isExternalSubject,
} from "../../utils/scheduleConflict";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminManageSchedule() {
  // ── Core data ──────────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState<ScheduleAssignment[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [otherFacs, setOtherFacs] = useState<any[]>([]);
  const [otherRooms, setOtherRooms] = useState<any[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // ── Active semester ─────────────────────────────────────────────────────────
  const [activeSem, setActiveSem] = useState<{ schoolYear: string; sem: 1 | 2 }>({
    schoolYear: "2024-2025",
    sem: 1,
  });

  // ── View & filters ──────────────────────────────────────────────────────────
  const [view, setView] = useState<"list" | "timetable">("list");
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState("All");
  const [filterFac, setFilterFac] = useState("All");
  const [filterProgram, setFilterProgram] = useState("All");
  const [filterRoom, setFilterRoom] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("subject_asc");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<
    | "add" | "edit" | "delete" | "scan" | "reasoning"
    | "fixResults" | "setup" | "audit"
    | null
  >(null);
  const [selected, setSelected] = useState<ScheduleAssignment | null>(null);
  const [fixResults, setFixResults] = useState<{
    changes: Array<{ subject: string; section: string; oldTime: string; oldRoom: string; newTime: string; newRoom: string }>;
    failed: ScheduleAssignment[];
  } | null>(null);

  // ── AI / advisor state ──────────────────────────────────────────────────────
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [scanning, setScanning] = useState(false);
  const [_scanned, setScanned] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cachedLoadAdvice, setCachedLoadAdvice] = useState<any[] | null>(null);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────────────────────────────────────
  const hasExistingSchedules = schedules.length > 0;

  const formattedSY = parseInt(
    (activeSem.schoolYear.split("-")[0]?.slice(-2) || "") +
      (activeSem.schoolYear.split("-")[1]?.slice(-2) || ""),
  );

  const hasExistingSections = curriculums.some((prog) =>
    prog.sections.some(
      (sec: any) => Number(sec.school_year) === Number(formattedSY),
    ),
  );

  const unresolvedItems = useMemo(
    () =>
      schedules.filter((s) => {
        if (isExternalSubject(s.subject_id)) return false;
        return s.day === "TBD" || s.start_time === "TBD" || s.room_id === "TBD" || !s.day;
      }),
    [schedules],
  );

  const drafts    = schedules.filter((s) => s.status === "draft").length;
  const finalized = schedules.filter((s) => s.status === "finalized").length;
  const published = schedules.filter((s) => s.status === "published").length;

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setCurrentPage(1);

    const loadData = async () => {
      try {
        const params = { schoolYear: activeSem.schoolYear, sem: activeSem.sem };
        const [
          facRes, subRes, roomRes, schedRes, currRes, otherFacRes, otherRoomRes,
        ] = await Promise.all([
          api.get("/manage-schedule/faculty",    { params }),
          api.get("/manage-schedule/subjects",   { params }),
          api.get("/manage-schedule/rooms",      { params }),
          api.get("/manage-schedule/schedules",  { params }),
          api.get("/manage-schedule/curriculums"),
          api.get("/manage-schedule/other-faculty").catch(() => ({ data: [] })),
          api.get("/manage-schedule/other-rooms").catch(()  => ({ data: [] })),
        ]);

        const unwrapArray = (response: any): any[] => {
          if (Array.isArray(response)) return response;
          if (response?.data && Array.isArray(response.data)) return response.data;
          return [];
        };

        const facData   = unwrapArray(facRes.data  ?? facRes);
        const subData   = unwrapArray(subRes.data  ?? subRes);
        const roomData  = unwrapArray(roomRes.data ?? roomRes);
        const schedData = unwrapArray(schedRes.data ?? schedRes);
        const currData  = unwrapArray(currRes.data ?? currRes);

        setOtherFacs(unwrapArray(otherFacRes?.data  ?? []));
        setOtherRooms(unwrapArray(otherRoomRes?.data ?? []));

        // Populate mutable in-memory lists used by conflict utils
        FACULTY_LIST.length = 0;
        FACULTY_LIST.push(
          ...facData.map((f: any) => {
            const personal = f.personal
              ? typeof f.personal === "string" ? JSON.parse(f.personal) : f.personal
              : null;
            const prefs = f.preferences
              ? typeof f.preferences === "string" ? JSON.parse(f.preferences) : f.preferences
              : {};
            return {
              id: f.id || f.faculty_id,
              personal: {
                firstName:      personal?.firstName      ?? f.first_name,
                lastName:       personal?.lastName       ?? f.last_name,
                employmentType: personal?.employmentType ?? f.employment_type ?? "Full-time",
                status:         personal?.status         ?? f.status          ?? "Active",
              },
              preferences: prefs,
              photo_url: f.photo_url,
            };
          }),
        );

        SUBJECT_LIST.length = 0;
        SUBJECT_LIST.push(
          ...subData.map((s: any) => ({
            id:             (s.subject_code ?? s.code ?? "").trim(),
            code:           (s.subject_code ?? s.code ?? "").trim(),
            name:           s.subject_name ?? s.name,
            units:          s.units ?? 0,
            facilityType:   s.facility_type   ?? s.facilityType   ?? "lecture",
            assignmentMode: s.assignment_mode ?? s.assignmentMode ?? "auto",
            canSplit:       s.can_split       ?? s.canSplit       ?? false,
            splitPattern:   s.split_pattern   ?? s.splitPattern   ?? null,
            semester:       s.semester ?? 1,
          })),
        );

        ROOM_LIST.length = 0;
        ROOM_LIST.push(
          ...roomData.map((r: any) => ({
            id:       r.id,
            room:     r.room,
            type:     r.type     ?? "lecture",
            capacity: r.capacity ?? 40,
          })),
        );

        setCurriculums(
          currData.map((c: any) => ({
            program: c.program || c.label,
            termSubjects: c.curriculum_term_subjects || [],
            sections: (c.curriculum_sections || []).map((sec: any) => ({
              label:     `${c.program || c.label} ${sec.year_level}-${sec.section}`,
              yearLevel: sec.year_level,
              semester:  sec.semester,
              section:   sec.section,
              school_year: sec.school_year,
            })),
          })),
        );

        setSchedules(
          schedData.map((s: any) => ({
            schedule_id:      s.schedule_id ?? s.id,
            faculty_id:       s.faculty_id       || "TBD",
            other_faculty_id: s.other_faculty_id || null,
            subject_id:       s.subject_id,
            room_id:          s.room_id           || "TBD",
            other_room_id:    s.other_room_id     || null,
            day:        s.day        || "TBD",
            start_time: s.start_time || "TBD",
            end_time:   s.end_time   || "TBD",
            section: s.section,
            status:  s.status ?? "draft",
            session_group_id: s.session_group_id,
            session_hours:    s.session_hours,
          })),
        );

        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to load database records:", error);
      }
    };

    loadData();
  }, [
    activeSem.schoolYear,
    activeSem.sem,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // FILTERING & PAGINATION
  // ─────────────────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = schedules.filter((s) => {
      const sub = getSubject(s.subject_id);
      const q = search.toLowerCase();
      const safeSection = s.section ? String(s.section).trim() : "";
      const sectionProgram = safeSection.split(" ")[0]?.toUpperCase() || "";

      const matchesSearch =
        !search ||
        (sub && sub.name.toLowerCase().includes(q)) ||
        (sub && sub.code.toLowerCase().includes(q)) ||
        safeSection.toLowerCase().includes(q);

      return (
        matchesSearch &&
        (filterDay     === "All" || s.day        === filterDay) &&
        (filterFac     === "All" || String(s.faculty_id) === String(filterFac)) &&
        (filterProgram === "All" || sectionProgram === filterProgram.toUpperCase()) &&
        (filterRoom    === "All" || String(s.room_id)    === String(filterRoom)) &&
        (filterStatus  === "All" || s.status      === filterStatus)
      );
    });

    result.sort((a, b) => {
      const subA = getSubject(a.subject_id)?.code || "";
      const subB = getSubject(b.subject_id)?.code || "";
      return sortOrder === "subject_desc"
        ? subB.localeCompare(subA)
        : subA.localeCompare(subB);
    });

    return result;
  }, [
    schedules, search, filterDay, filterFac, filterProgram,
    filterRoom, filterStatus, sortOrder, isDataLoaded,
  ]);

  const totalPages  = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // MODAL HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  const openEdit   = (s: ScheduleAssignment) => { setSelected(s); setModal("edit"); };
  const openDelete = (s: ScheduleAssignment) => { setSelected(s); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); };

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSave = async (
    entry: any,
    customFacName?: string,
    customRoomName?: string,
  ) => {
    try {
      let finalFacId:     string | null = entry.faculty_id;
      let finalOtherFacId: string | null = entry.other_faculty_id;
      let finalRoomId:    string | null = entry.room_id;
      let finalOtherRoomId: string | null = entry.other_room_id;

      const facultySafeRegex = /^[a-zA-Z\s.,'-]{2,50}$/;
      const roomSafeRegex    = /^[a-zA-Z0-9\s-]{2,30}$/;

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

      if (finalFacId === "OTHER" && customFacName) {
        const normalizedName = customFacName.trim().replace(/\b\w/g, (c) => c.toUpperCase());
        const fRes = await api.post("/manage-schedule/other-faculty", { name: normalizedName });
        finalOtherFacId = fRes.data.id || fRes.data.other_faculty_id || null;
        finalFacId = null;
      } else if (finalFacId === "TBD") {
        finalFacId = null;
      }

      if (finalRoomId === "OTHER" && customRoomName) {
        const normalizedRoom = customRoomName.trim().toUpperCase();
        const rRes = await api.post("/manage-schedule/other-rooms", { name: normalizedRoom });
        finalOtherRoomId = rRes.data.id || rRes.data.other_room_id || null;
        finalRoomId = null;
      } else if (finalRoomId === "TBD") {
        finalRoomId = null;
      }

      if (finalFacId && otherFacs.some((f: any) => f.id === finalFacId || f.other_faculty_id === finalFacId)) {
        finalOtherFacId = finalFacId;
        finalFacId = null;
      }
      if (finalRoomId && otherRooms.some((r: any) => r.id === finalRoomId || r.other_room_id === finalRoomId)) {
        finalOtherRoomId = finalRoomId;
        finalRoomId = null;
      }

      const payload = {
        faculty_id:       finalFacId      === "TBD" ? null : finalFacId,
        other_faculty_id: finalOtherFacId || null,
        room_id:          finalRoomId     === "TBD" ? null : finalRoomId,
        other_room_id:    finalOtherRoomId || null,
        subject_id:  entry.subject_id,
        day:         !entry.day        || entry.day        === "TBD" ? null : entry.day,
        start_time:  !entry.start_time || entry.start_time === "TBD" ? null : entry.start_time,
        end_time:    !entry.end_time   || entry.end_time   === "TBD" ? null : entry.end_time,
        section:     entry.section,
        status:      entry.status ?? "draft",
        session_group_id: entry.session_group_id,
        session_hours:    entry.session_hours,
        school_year: activeSem.schoolYear,
        semester:    activeSem.sem,
      };

      if (modal === "edit") {
        await api.patch(`/manage-schedule/schedules/${entry.schedule_id}`, payload);
      } else {
        const res = await api.post("/manage-schedule/schedules", payload);
        entry.schedule_id = res.data.id || res.data.schedule_id;
      }

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
      setSchedules((p) => p.filter((s) => s.schedule_id !== selected.schedule_id));
      setScanned(false);
      closeModal();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete schedule from database.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CONFLICT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
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
        const remaining = c.transfers.filter((t) => !transferredIds.has(t.scheduleId));
        return remaining.length === c.transfers.length
          ? c
          : { ...c, transfers: remaining, applied: remaining.length === 0 };
      }),
    );
    try {
      await Promise.all(
        transfers.map((t) =>
          api.patch(`/manage-schedule/schedules/${t.scheduleId}`, { faculty_id: t.toFacultyId }),
        ),
      );
    } catch (err) {
      console.error("[DB Error] Failed to save transfers:", err);
    }
    setScanned(false);
  };

  const runScan = async (silent = false, schedulesToScan = schedules) => {
    setScanning(true);
    setScanned(false);
    const localConflicts = runConflictScan(schedulesToScan);
    setConflicts(localConflicts);
    setScanning(false);
    setScanned(true);

    if (silent) {
      console.log("[DeptFlow] Local scan complete. Skipping AI Advisor (Silent Mode).");
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
      const geminiSuggestions = await enrichConflictsWithGemini(context, validationContext);
      if (geminiSuggestions.length > 0) {
        setConflicts((prev) =>
          prev
            .map((conflict) => {
              const match = geminiSuggestions.find((g) => g.conflictId === conflict.id);
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
              (c) => !(categorizeByFixability(c) === "NEEDS_AI" && !c.suggestion),
            ),
        );
      }
    } catch (err) {
      console.error("Gemini Advisor failed:", err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTO-FIX HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDeterministicFix = async () => {
    const clonedSchedules = JSON.parse(JSON.stringify(schedules));
    const { fixedSchedules } = resolveConflictsDeterministically(clonedSchedules);

    const changes: Array<{
      subject: string; section: string;
      oldTime: string; oldRoom: string;
      newTime: string; newRoom: string;
    }> = [];
    const dbUpdates: Promise<any>[] = [];

    fixedSchedules.forEach((newSched: ScheduleAssignment) => {
      const oldSched = schedules.find((s) => s.schedule_id === newSched.schedule_id);
      if (oldSched) {
        const changedTime = oldSched.start_time !== newSched.start_time || oldSched.day !== newSched.day;
        const changedRoom = oldSched.room_id !== newSched.room_id;
        if (changedTime || changedRoom) {
          const sub        = getSubject(newSched.subject_id);
          const oldRoomObj = getRoom(oldSched.room_id ?? "");
          const newRoomObj = getRoom(newSched.room_id ?? "");
          changes.push({
            subject:  sub?.code ?? newSched.subject_id,
            section:  newSched.section,
            oldTime:  oldSched.start_time === "TBD" ? "Unscheduled" : `${oldSched.day} ${oldSched.start_time}`,
            oldRoom:  oldRoomObj?.room ?? "Unassigned",
            newTime:  `${newSched.day} ${newSched.start_time}`,
            newRoom:  newRoomObj?.room ?? newSched.room_id,
          });
          dbUpdates.push(
            api.patch(`/manage-schedule/schedules/${newSched.schedule_id}`, {
              day:        newSched.day,
              start_time: newSched.start_time,
              end_time:   newSched.end_time,
              room_id:    newSched.room_id,
            }).catch((err) => console.error("[DB Error] Failed to auto-fix", err)),
          );
        }
      }
    });

    if (dbUpdates.length > 0) {
      try { await Promise.all(dbUpdates); }
      catch (e) { console.error("DB saves failed"); }
    }

    setSchedules(fixedSchedules);
    const failedSchedules = fixedSchedules.filter(
      (s: ScheduleAssignment) => s.day === "TBD" || s.start_time === "TBD" || s.room_id === "TBD",
    );
    setFixResults({ changes, failed: failedSchedules });
    setModal("fixResults");
    runScan(true, fixedSchedules);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FINALIZE / PUBLISH HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleFinalize = async () => {
    const toFinalize = schedules.filter((s) => s.status === "draft");
    if (toFinalize.length === 0) { closeModal(); return; }
    setSchedules((p) =>
      p.map((s) =>
        s.status === "draft" ? { ...s, status: "finalized" as ScheduleStatus } : s,
      ),
    );
    try {
      await Promise.all(
        toFinalize.map((entry) =>
          api.patch(`/manage-schedule/schedules/${entry.schedule_id}`, { status: "finalized" }),
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
    if (toPublish.length === 0) { alert("No finalized schedules to publish."); return; }
    if (!window.confirm(`Publish ${toPublish.length} finalized schedule entry(ies)?`)) return;

    setSchedules((p) =>
      p.map((s) =>
        s.status === "finalized" ? { ...s, status: "published" as ScheduleStatus } : s,
      ),
    );
    try {
      await Promise.all(
        toPublish.map((entry) =>
          api.patch(`/manage-schedule/schedules/${entry.schedule_id}`, { status: "published" }),
        ),
      );
    } catch {
      setSchedules((p) =>
        p.map((s) =>
          s.status === "published" && toPublish.find((x) => x.schedule_id === s.schedule_id)
            ? { ...s, status: "finalized" as ScheduleStatus }
            : s,
        ),
      );
      alert("Failed to publish schedules.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATE HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateSchedule({ sem: activeSem.sem });
      setSchedules(result.schedule);
      const savedEntries = await Promise.all(
        result.schedule.map(async (entry) => {
          const payload = {
            schedule_id:      entry.schedule_id,
            faculty_id:       entry.faculty_id  === "TBD" ? null : entry.faculty_id,
            subject_id:       entry.subject_id,
            room_id:          entry.room_id     === "TBD" ? null : entry.room_id,
            day:              entry.day         === "TBD" ? null : entry.day,
            start_time:       entry.start_time  === "TBD" ? null : entry.start_time,
            end_time:         entry.end_time    === "TBD" ? null : entry.end_time,
            section:          entry.section,
            status:           "draft",
            session_group_id: entry.session_group_id,
            session_hours:    entry.session_hours,
            school_year:      activeSem.schoolYear,
            semester:         activeSem.sem,
          };
          const res = await api.post("/manage-schedule/schedules", payload);
          const realId = res.data?.schedule_id ?? res.data?.data?.id ?? entry.schedule_id;
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

  // ─────────────────────────────────────────────────────────────────────────────
  // AI AUDIT / ADVISOR HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────
  const handleRunAiAudit = async () => {
    setIsAuditing(true);
    try {
      const localConflicts = runConflictScan(schedules);
      const context = buildGeminiContext(schedules, localConflicts);
      const report = await validateFullScheduleAdherence(context);
      setAiReport(report);
      setModal("audit");
    } catch {
      alert("AI Audit failed.");
    } finally {
      setIsAuditing(false);
    }
  };

  const generateNewLoadAdvice = async () => {
    setIsAdvisorLoading(true);
    try {
      // ✅ FACULTY_LIST is already populated from loadData's useEffect
      // No need for another api.get call here
      const localConflicts = runConflictScan(schedules);
      const context = buildGeminiContext(schedules, localConflicts);

      // Use FACULTY_LIST directly (already has the right semester's faculty)
      const validationContext: ValidationContext = {
        ...context,
        allSchedules: schedules,
        allFaculty: FACULTY_LIST.map((f) => ({
          id: f.id,
          personal: {
            first_name: f.personal.firstName,
            last_name:  f.personal.lastName,
            employmentType: f.personal.employmentType,
          },
          preferences: {
            subjectSpecializations: f.preferences?.subject_specializations ?? [],
          },
        })),
        allSubjects: SUBJECT_LIST,
      };

      const geminiSuggestions = await enrichConflictsWithGemini(context, validationContext);
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
  
  const handleOpenLoadAdvisor = async () => {
    setIsAdvisorModalOpen(true);
    if (cachedLoadAdvice !== null) return;
    await generateNewLoadAdvice();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SETUP SECTIONS HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSetupSections = async (counts: any) => {
    try {
      await api.post("/manage-schedule/curriculums/setup-sections", {
        schoolYear: activeSem.schoolYear,
        semester:   activeSem.sem,
        counts,
      });
      alert("Sections successfully generated!");
      setModal(null);
      window.location.reload();
    } catch (error) {
      console.error("Failed to setup sections:", error);
      alert("Failed to save sections.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-0 space-y-6 font-lexend">

          {/* Page Header */}
          <SchedulePageHeader
            activeSem={activeSem}
            onSchoolYearChange={(year) => setActiveSem((p) => ({ ...p, schoolYear: year }))}
            onSemChange={(sem) => setActiveSem((p) => ({ ...p, sem }))}
            hasExistingSections={hasExistingSections}
            hasExistingSchedules={hasExistingSchedules}
            generating={generating}
            scanning={scanning}
            onSetupSections={() => setModal("setup")}
            onGenerate={handleGenerate}
            onAddAssignment={() => setModal("add")}
          />

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ScheduleStatCard
              label="Total Assignments"
              value={schedules.length}
              icon={<BookOpen size={22} />}
              sub="This semester"
            />
            <ScheduleStatCard
              label="Draft"
              value={drafts}
              icon={<Clock size={22} />}
              sub="Pending review"
            />
            <ScheduleStatCard
              label="Finalized"
              value={finalized}
              icon={<ShieldCheck size={22} />}
              sub="Ready to publish"
            />
            <ScheduleStatCard
              label="Published"
              value={published}
              icon={<CheckCircle2 size={22} />}
              sub="Visible on profiles"
            />
          </div>

          {/* Contextual Banners */}
          {drafts > 0 && (
            <ScheduleDraftBanner
              drafts={drafts}
              unresolvedItems={unresolvedItems}
              isAuditing={isAuditing}
              aiReport={aiReport}
              isAdvisorLoading={isAdvisorLoading}
              onFinalize={handleFinalize}
              onAutoFix={handleDeterministicFix}
              onAiAudit={() => (aiReport ? setModal("audit") : handleRunAiAudit())}
              onLoadAdvisor={handleOpenLoadAdvisor}
            />
          )}

          {finalized > 0 && drafts === 0 && (
            <ScheduleFinalizedBanner
              finalized={finalized}
              onPublish={handlePublish}
            />
          )}

          {unresolvedItems.length > 0 && (
            <ScheduleUnresolvedBanner
              unresolvedCount={unresolvedItems.length}
              onViewList={() => setModal("fixResults")}
            />
          )}

          {/* Main Content: List/Timetable + Load Monitor Sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-6 items-start">
            <div className="space-y-4 w-full">

              {/* Filter Bar */}
              <ScheduleFilterBar
                view={view}
                onViewChange={setView}
                search={search}
                onSearchChange={setSearch}
                filterDay={filterDay}
                onFilterDayChange={setFilterDay}
                filterFac={filterFac}
                onFilterFacChange={setFilterFac}
                filterProgram={filterProgram}
                onFilterProgramChange={setFilterProgram}
                filterRoom={filterRoom}
                onFilterRoomChange={setFilterRoom}
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
              />

              {/* Results Count */}
              <p className="text-xs text-gray-500 px-1">
                Showing{" "}
                <span className="font-bold text-gray-800">
                  {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}
                  {" - "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
                </span>{" "}
                of {filtered.length} assignments
              </p>

              {/* Empty State / Views */}
              {filtered.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center text-gray-400">
                  <p className="text-sm">No assignments found.</p>
                </div>
              ) : (
                <>
                  {view === "list" && (
                    <ScheduleListView
                      data={paginatedData}
                      otherFacs={otherFacs}
                      otherRooms={otherRooms}
                      onEdit={openEdit}
                      onDelete={openDelete}
                    />
                  )}
                  {view === "timetable" && (
                    <ScheduleTimetableView
                      data={filtered}
                      otherFacs={otherFacs}
                      otherRooms={otherRooms}
                      onEdit={openEdit}
                      onDelete={openDelete}
                    />
                  )}
                </>
              )}

              {/* Pagination */}
              {totalPages > 1 && view === "list" && (
                <div className="flex items-center justify-between px-2 pt-2 pb-8">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}
                    -{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
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
                          onClick={() => typeof num === "number" && setCurrentPage(num)}
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
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-400 hover:text-burgundy disabled:opacity-30 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: Load Monitor */}
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
            <ScheduleDeleteModal
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

          {modal === "audit" && aiReport && (
            <AuditModal
              report={aiReport}
              isAuditing={isAuditing}
              onClose={() => setModal(null)}
              onRefreshAudit={handleRunAiAudit}
            />
          )}

          {isAdvisorModalOpen && (
            <AIAdvisorModal
              isLoading={isAdvisorLoading}
              cachedAdvice={cachedLoadAdvice}
              onClose={() => setIsAdvisorModalOpen(false)}
              onRecalculate={generateNewLoadAdvice}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}