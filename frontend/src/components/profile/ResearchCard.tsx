import { useState } from "react";
import { Trash2, BookOpen } from "lucide-react";
import type { Research } from "../../types/profile";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface ResearchCardProps {
  research: Research;
  onDelete?: (id: string | undefined) => void;
}

export default function ResearchCard({
  research,
  onDelete,
}: ResearchCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      onDelete?.(research.researchId);
      setIsModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="p-4 border border-slate-200 rounded-lg">
        {/* Header with Icon and Content */}
        <div className="flex items-start justify-between">
          {/* Icon and Content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-md bg-red-100 flex items-center justify-center">
                <BookOpen size={18} className="text-burgundy" />
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-slate-900 text-sm break-words">
                {research.title}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 break-words">
                {research.journalConference}
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-xs sm:text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">Type:</span>{" "}
                  {research.type}
                </p>
                <p className="text-xs sm:text-sm text-slate-600">
                  <span className="font-semibold text-slate-700">
                    Year Published:
                  </span>{" "}
                  {research.year}
                </p>
              </div>
            </div>
          </div>

          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="p-2 text-slate-400 hover:text-red-500 transition flex-shrink-0 ml-2 cursor-pointer"
              title="Delete research"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        title="Delete Research"
        message="Are you sure you want to delete this research record? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsModalOpen(false)}
        isLoading={isDeleting}
      />
    </>
  );
}
