import { Trash2 } from "lucide-react";
import { Modal } from "../common/Modal";
import {
  getFaculty,
  getSubject,
  getFacultyName,
} from "../../utils/scheduleConflict";
import type { ScheduleAssignment } from "../../utils/geminiSchedHelper";

interface ScheduleDeleteModalProps {
  schedule: ScheduleAssignment;
  onConfirm: () => void;
  onClose: () => void;
}

export function ScheduleDeleteModal({
  schedule,
  onConfirm,
  onClose,
}: ScheduleDeleteModalProps) {
  const f = getFaculty(schedule.faculty_id ?? "");
  const s = getSubject(schedule.subject_id);

  return (
    <Modal title="Remove Assignment" onClose={onClose} maxWidth="max-w-sm">
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
          <Trash2 size={22} />
        </div>
        <p className="font-bold text-gray-900 mb-2">Remove this assignment?</p>
        <p className="text-sm text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-700">{s?.code}</span>
          <br />
          Assigned to <span className="font-semibold">{getFacultyName(f)}</span>
        </p>
      </div>
      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
        >
          Remove
        </button>
      </div>
    </Modal>
  );
}