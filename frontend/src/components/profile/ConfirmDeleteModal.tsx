import { Trash2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-burgundy">
            <Trash2 className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-burgundy uppercase">{title}</h2>
        </div>

        <p className="text-sm text-slate-600 mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-burgundy rounded hover:bg-burgundy/90 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
