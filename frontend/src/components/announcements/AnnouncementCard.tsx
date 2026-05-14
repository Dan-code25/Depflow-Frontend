import {
  Trash2,
  Calendar,
  User,
  Megaphone,
  Edit,
  FileText,
} from "lucide-react";
import { useState } from "react";
import type { Announcement } from "../../types/profile";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface AnnouncementCardProps {
  announcement: Announcement;
  onDelete?: (id: string) => void;
  onEdit?: (announcement: Announcement) => void;
  isReadOnly?: boolean;
}

export function AnnouncementCard({
  announcement,
  onDelete,
  onEdit,
  isReadOnly = false,
}: AnnouncementCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(announcement.id || "");
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
        {/* Left Accent Bar */}
        <div className="flex">
          <div className="w-1 bg-gradient-to-b from-burgundy to-burgundy/60" />

          <div className="flex-1 p-5">
            {/* Header with Icon */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Icon Badge */}
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-md bg-burgundy/10 flex items-center justify-center">
                    <Megaphone size={20} className="text-burgundy" />
                  </div>
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-charcoal leading-snug">
                    {announcement.title}
                  </h3>
                </div>
              </div>

              {/* Edit and Delete Buttons */}
              <div className="flex gap-2 flex-shrink-0">
                {!isReadOnly && onEdit && (
                  <button
                    onClick={() => onEdit(announcement)}
                    className="p-2 text-slate-400 hover:text-burgundy hover:bg-burgundy/5 rounded-md transition-all duration-200 cursor-pointer"
                    aria-label="Edit announcement"
                  >
                    <Edit size={20} />
                  </button>
                )}
                {!isReadOnly && onDelete && (
                  <button
                    onClick={handleDeleteClick}
                    className="p-2 text-slate-400 hover:text-burgundy hover:bg-burgundy/5 rounded-md transition-all duration-200 cursor-pointer"
                    aria-label="Delete announcement"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <p className="text-slate-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap break-words">
              {announcement.content}
            </p>

            {/* Attachments */}
            {announcement.attachments &&
              announcement.attachments.length > 0 && (
                <div className="mb-4 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-2">
                    Attachments ({announcement.attachments.length})
                  </p>
                  <div className="space-y-1.5">
                    {announcement.attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.url}
                        download={attachment.filename}
                        className="flex items-center gap-2 text-sm text-burgundy hover:text-burgundy/80 transition-colors cursor-pointer"
                      >
                        <FileText size={14} />
                        <span className="truncate hover:underline">
                          {attachment.filename}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            {/* Meta Information */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
              {(announcement.firstName || announcement.lastName) && (
                <div className="flex items-center gap-1.5">
                  <User size={14} className="text-slate-400" />
                  <span className="font-medium">
                    {announcement.firstName} {announcement.lastName}
                  </span>
                </div>
              )}
              {announcement.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  <span>
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
