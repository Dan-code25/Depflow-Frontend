import { X } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-sm w-full animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-slate-200">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-slate-600 cursor-pointer font-medium bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 font-medium rounded-md cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDangerous
                  ? "bg-burgundy hover:bg-burgundy/90 text-white"
                  : "bg-burgundy hover:bg-burgundy/90 text-white"
              }`}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
