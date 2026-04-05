import { useState } from "react";
import { Trash2, BookOpen } from "lucide-react";
import type { Education } from "../../types/profile";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface EducationCardProps {
  education: Education;
  onDelete?: (id: string | undefined) => void;
}

export default function EducationCard({
  education,
  onDelete,
}: EducationCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDegree = () => {
    if (education.degreeLevel === "PhD") {
      return `PhD in ${education.major}`;
    }
    return `${education.degreeLevel} of ${education.degreeType} in ${education.major}`;
  };

  const handleDeleteClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      onDelete?.(education.edId);
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
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 text-sm break-words">
                {formatDegree()}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 break-words">
                {education.university}
              </p>
              <p className="text-xs sm:text-sm mt-2">
                <span className="font-semibold text-slate-700">Graduated:</span>{" "}
                <span className="text-slate-600">
                  {education.yearGraduated}
                </span>
              </p>
            </div>
          </div>

          {/* Delete Button */}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="p-2 text-slate-400 hover:text-red-500 transition flex-shrink-0 ml-2 cursor-pointer"
              title="Delete education"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        title="Delete Education"
        message="Are you sure you want to delete this education record? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsModalOpen(false)}
        isLoading={isDeleting}
      />
    </>
  );
}
