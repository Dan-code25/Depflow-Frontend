import { useState, useEffect } from "react";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Modal } from "../common/Modal";
import { ConflictCard } from "./ConflictCard";
import {
  categorizeByFixability,
  type Conflict,
  type ConflictTransfer,
} from "../../utils/scheduleConflict";

interface ConflictScanModalProps {
  initialConflicts: Conflict[];
  onApplyFix: (fix: any) => void;
  onApplyTransfers: (transfers: ConflictTransfer[]) => void;
  onClose: () => void;
  onFinalize: () => void;
}

export function ConflictScanModal({
  initialConflicts,
  onApplyFix,
  onApplyTransfers,
  onClose,
  onFinalize,
}: ConflictScanModalProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>(initialConflicts);

  useEffect(() => {
    setConflicts(initialConflicts);
  }, [initialConflicts]);

  const needsAI = conflicts.filter(
    (c) =>
      !c.dismissed &&
      !c.applied &&
      categorizeByFixability(c) === "NEEDS_AI" &&
      c.suggestion,
  );
  const resolved = conflicts.filter((c) => c.dismissed || c.applied);

  const hardUnresolved = conflicts.filter(
    (c) => c.type === "HARD" && !c.dismissed && !c.applied,
  );
  const overloadConflicts = hardUnresolved.filter((c) =>
    c.id.startsWith("overload-"),
  );
  const canFinalize = hardUnresolved.length === 0;

  const handleApply = (c: Conflict) => {
    onApplyFix(c.fix);
    setConflicts((p) =>
      p.map((x) => (x.id === c.id ? { ...x, applied: true } : x)),
    );
  };

  const handleDismiss = (id: string) =>
    setConflicts((p) =>
      p.map((c) => (c.id === id ? { ...c, dismissed: true } : c)),
    );

  const handleTransfer = (conflictId: string, t: ConflictTransfer) => {
    onApplyTransfers([t]);
    setConflicts((p) =>
      p.map((c) => {
        if (c.id !== conflictId) return c;
        const remaining = c.transfers.filter((x) => x.scheduleId !== t.scheduleId);
        return { ...c, transfers: remaining, applied: remaining.length === 0 };
      }),
    );
  };

  return (
    <Modal title="AI Faculty Load Advisor" onClose={onClose} maxWidth="max-w-2xl">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className={`rounded-xl border p-4 flex flex-col items-center justify-center ${
            needsAI.length
              ? "bg-violet-50 border-violet-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div
            className={`text-3xl font-black ${
              needsAI.length ? "text-violet-600" : "text-gray-400"
            }`}
          >
            {needsAI.length}
          </div>
          <div
            className={`text-xs font-bold mt-1 ${
              needsAI.length ? "text-violet-600" : "text-gray-400"
            }`}
          >
            Pending Reassignments
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-gray-400">{resolved.length}</div>
          <div className="text-xs font-bold text-gray-400 mt-1">Resolved</div>
        </div>
      </div>

      {needsAI.length > 0 && (
        <div className="mb-6 p-4 bg-violet-50 border-2 border-violet-200 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-violet-600" />
            <p className="text-sm font-bold text-violet-700">
              AI Reassignment Suggestions ({needsAI.length})
            </p>
            <p className="ml-auto text-xs text-violet-600">Resolve faculty overloads</p>
          </div>
          <div className="space-y-3">
            {needsAI.map((c) => (
              <ConflictCard
                key={c.id}
                c={c}
                onApply={c.fix ? handleApply : null}
                onDismiss={c.type === "SOFT" ? handleDismiss : null}
                onTransfer={
                  c.transfers?.length
                    ? (t: ConflictTransfer) => handleTransfer(c.id, t)
                    : null
                }
              />
            ))}
          </div>
        </div>
      )}

      {needsAI.length === 0 && (
        <div className="flex flex-col items-center py-10 gap-3 mb-6 bg-green-50 border-2 border-green-200 rounded-xl">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 size={32} />
          </div>
          <div className="text-center">
            <p className="font-bold text-green-900 text-lg">No Overloads Detected!</p>
            <p className="text-sm text-green-700 mt-1">
              Faculty workloads are balanced. <br />
              (Use 'Auto-Fix' for any remaining room or time overlaps).
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <button
          onClick={() => canFinalize && onFinalize()}
          disabled={!canFinalize}
          className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
            canFinalize
              ? "bg-[#8B0000] text-white hover:bg-[#6B0000]"
              : "bg-gray-100 text-gray-500 cursor-not-allowed"
          }`}
        >
          <ShieldCheck size={16} />
          {canFinalize
            ? "Finalize Schedule"
            : overloadConflicts.length > 0
              ? `Resolve ${overloadConflicts.length} faculty overload(s) to continue`
              : `Run 'Auto-Fix Rooms' on the dashboard to resolve other conflicts`}
        </button>
      </div>
    </Modal>
  );
}