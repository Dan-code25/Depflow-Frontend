import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal } from "../common/Modal";
import { getSubject, getFaculty, getFacultyName } from "../../utils/scheduleConflict";
import type { ScheduleAssignment } from "../../utils/geminiSchedHelper";

interface AutoFixChange {
  subject: string;
  section: string;
  oldTime: string;
  oldRoom: string;
  newTime: string;
  newRoom: string;
}

interface AutoFixResultsModalProps {
  data: {
    changes: AutoFixChange[];
    failed: ScheduleAssignment[];
  };
  onClose: () => void;
}

export function AutoFixResultsModal({ data, onClose }: AutoFixResultsModalProps) {
  return (
    <Modal title="Auto-Fix Results" onClose={onClose} maxWidth="max-w-2xl">
      {/* Success Summary */}
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
        <CheckCircle2 size={24} className="text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-green-900">
            Successfully resolved and saved {data.changes.length} conflict(s).
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            These changes have been permanently applied to the database.
          </p>
        </div>
      </div>

      {/* Changes Log */}
      {data.changes.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Resolution Log
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {data.changes.map((c, i) => (
              <div
                key={i}
                className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm"
              >
                <p className="font-bold text-gray-800 mb-1">
                  {c.subject}{" "}
                  <span className="text-gray-400 font-normal">({c.section})</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="line-through text-red-400">
                    {c.oldTime} in {c.oldRoom}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-semibold text-green-600">
                    {c.newTime} in {c.newRoom}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failures Log */}
      {data.failed.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <p className="text-sm font-bold text-red-900">
              Could not resolve {data.failed.length} assignment(s)
            </p>
          </div>
          <p className="text-xs text-red-700 mb-3">
            These classes literally ran out of physical space or faculty hours. You
            must fix these manually by changing the professor or splitting the class.
          </p>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {data.failed.map((s, i) => {
              const sub = getSubject(s.subject_id);
              const fac = getFaculty(s.faculty_id ?? "");
              return (
                <div
                  key={i}
                  className="bg-white border border-red-100 rounded-lg p-2 flex justify-between text-xs"
                >
                  <span className="font-bold text-red-800">
                    {sub?.code ?? s.subject_id}{" "}
                    <span className="text-red-400 font-normal">({s.section})</span>
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {getFacultyName(fac)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100 text-right">
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}