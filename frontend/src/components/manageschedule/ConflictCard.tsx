import { AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { ConflictBadge } from "./ConflictBadge";
import type { Conflict, ConflictTransfer } from "../../utils/scheduleConflict";

interface ConflictCardProps {
  c: Conflict;
  onApply: ((c: Conflict) => void) | null;
  onDismiss: ((id: string) => void) | null;
  onTransfer: ((t: ConflictTransfer) => void) | null;
}

export function ConflictCard({
  c,
  onApply,
  onDismiss,
  onTransfer,
}: ConflictCardProps) {
  const isHard = c.type === "HARD";

  return (
    <div
      className={`rounded-xl border p-4 mb-3 ${
        isHard ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={16}
          className={`shrink-0 mt-0.5 ${isHard ? "text-red-500" : "text-amber-500"}`}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <ConflictBadge type={c.type} />
            <span
              className={`text-xs font-bold ${
                isHard ? "text-red-700" : "text-amber-700"
              }`}
            >
              {c.label}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{c.message}</p>

          {c.transfers?.length > 0 && onTransfer ? (
            <div className="bg-white/80 border border-red-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck size={11} className="text-red-600" />
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wide">
                  One-Click Transfers
                </span>
              </div>
              {c.transfers.map((t: ConflictTransfer) => (
                <div
                  key={t.scheduleId}
                  className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800">
                      {t.subjectCode}{" "}
                      <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                        ({t.units}u)
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      → {t.toFacultyName}
                    </p>
                  </div>
                  <button
                    onClick={() => onTransfer(t)}
                    disabled={!t.toFacultyId}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      t.toFacultyId
                        ? "bg-[#8B0000] text-white hover:bg-[#6B0000]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    } cursor-pointer`}
                  >
                    <ShieldCheck size={11} /> Transfer
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/70 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={11} className="text-violet-600" />
                <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wide">
                  AI Suggested Fix
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{c.suggestion}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {onApply && (
          <button
            onClick={() => onApply(c)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer ${
              isHard
                ? "bg-[#8B0000] hover:bg-[#6B0000]"
                : "bg-violet-600 hover:bg-violet-700"
            }`}
          >
            <ShieldCheck size={13} /> Apply Suggestion
          </button>
        )}
        {onDismiss && (
          <button
            onClick={() => onDismiss(c.id)}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}