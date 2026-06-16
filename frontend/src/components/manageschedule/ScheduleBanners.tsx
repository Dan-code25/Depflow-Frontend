import { Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { ScheduleAssignment } from "../../utils/geminiSchedHelper";

// ─────────────────────────────────────────────────────────────────────────────
// Draft Banner — shown when drafts exist; provides bulk-action tools
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleDraftBannerProps {
  drafts: number;
  unresolvedItems: ScheduleAssignment[];
  isAuditing: boolean;
  aiReport: string | null;
  isAdvisorLoading: boolean;
  onFinalize: () => void;
  onAutoFix: () => void;
  onAiAudit: () => void;
  onLoadAdvisor: () => void;
}

export function ScheduleDraftBanner({
  drafts,
  unresolvedItems,
  isAuditing,
  aiReport,
  isAdvisorLoading,
  onFinalize,
  onAutoFix,
  onAiAudit,
  onLoadAdvisor,
}: ScheduleDraftBannerProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-violet-50 border border-violet-200 rounded-xl">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 shrink-0">
          <Sparkles size={20} />
        </div>
        <div>
          <p className="text-base font-bold text-violet-900">
            {drafts} draft assignment{drafts !== 1 ? "s" : ""} pending check
          </p>
          <p className="text-sm text-violet-700 mt-0.5">
            Use the tools below to resolve time/room overlaps and balance faculty
            workloads.
          </p>
        </div>
      </div>

      {/* Finalize Button */}
      <button
        onClick={onFinalize}
        disabled={unresolvedItems.length > 0}
        title={
          unresolvedItems.length > 0
            ? "Please resolve missing rooms/times first"
            : "Finalize all drafts"
        }
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-colors ${
          unresolvedItems.length > 0
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-[#8B0000] hover:bg-[#6B0000] text-white shadow-[#8B0000]/20"
        }`}
      >
        <ShieldCheck size={14} /> Finalize Schedules
      </button>

      {/* Tool Buttons */}
      <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
        <button
          onClick={onAutoFix}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-md shadow-green-200 transition-colors"
        >
          <CheckCircle2 size={14} /> Auto-Fix Rooms
        </button>
        <button
          onClick={onAiAudit}
          disabled={isAuditing}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
            aiReport
              ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-300"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          <Sparkles size={14} />
          {isAuditing ? "Auditing..." : aiReport ? "View AI Audit" : "AI Schedule Audit"}
        </button>
        <button
          onClick={onLoadAdvisor}
          disabled={isAdvisorLoading}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-md shadow-violet-200 transition-colors"
        >
          <Sparkles size={14} />
          {isAdvisorLoading ? "Loading Advisor..." : "AI Load Advisor"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Finalized Banner — shown when schedules are finalized and ready to publish
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleFinalizedBannerProps {
  finalized: number;
  onPublish: () => void;
}

export function ScheduleFinalizedBanner({
  finalized,
  onPublish,
}: ScheduleFinalizedBannerProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
      <CheckCircle2 size={18} className="text-green-600 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-bold text-green-800">
          {finalized} schedule{finalized !== 1 ? "s" : ""} finalized — no conflicts
          detected.
        </p>
        <p className="text-xs text-green-700 mt-0.5">
          Click <strong>Publish</strong> to make these visible on faculty profiles.
        </p>
      </div>
      <button
        onClick={onPublish}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#8B0000] hover:bg-[#6B0000] text-white rounded-lg text-xs font-bold shadow-md shadow-[#8B0000]/20 transition-colors"
      >
        <CheckCircle2 size={13} /> Publish Now
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unresolved Banner — shown when auto-fix could not place some assignments
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleUnresolvedBannerProps {
  unresolvedCount: number;
  onViewList: () => void;
}

export function ScheduleUnresolvedBanner({
  unresolvedCount,
  onViewList,
}: ScheduleUnresolvedBannerProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-4">
      <AlertTriangle size={18} className="text-red-600 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-bold text-red-900">
          {unresolvedCount} Unresolved Assignment(s)
        </p>
        <p className="text-xs text-red-700 mt-0.5">
          These schedules could not be auto-fixed due to physical constraints (no
          rooms/hours left).
        </p>
      </div>
      <button
        onClick={onViewList}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md shadow-red-200 transition-colors"
      >
        <Info size={13} /> View List
      </button>
    </div>
  );
}