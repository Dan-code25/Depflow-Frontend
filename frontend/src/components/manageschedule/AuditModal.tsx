import { Sparkles } from "lucide-react";
import { Modal } from "../common/Modal";

interface AuditModalProps {
  report: string;
  isAuditing: boolean;
  onClose: () => void;
  onRefreshAudit: () => void;
}

export function AuditModal({
  report,
  isAuditing,
  onClose,
  onRefreshAudit,
}: AuditModalProps) {
  return (
    <Modal
      title="AI Compliance Audit Report"
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="bg-gray-50 p-6 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed text-gray-800 font-lexend border border-gray-100 shadow-inner max-h-[60vh] overflow-y-auto">
        {report}
      </div>
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          onClick={onRefreshAudit}
          disabled={isAuditing}
          className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
        >
          <Sparkles size={14} />
          {isAuditing ? "Re-Auditing..." : "Request Fresh Audit"}
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
        >
          Close Report
        </button>
      </div>
    </Modal>
  );
}