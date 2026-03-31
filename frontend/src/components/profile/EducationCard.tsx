import { useState } from "react";
import { Trash2, BookOpen } from "lucide-react";
import type { Education } from "../../types/profile";
import ConfirmDeleteModal from "./ConfirmDeleteModal";

interface EducationCardProps {
  education: Education;
  onDelete: (id: string | undefined) => void;
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
      onDelete(education.edId);
      setIsModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between p-4 border border-slate-200 rounded-lg">
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <div className="text-burgundy mt-0.5 flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">
                {formatDegree()}
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {education.university}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-burgundy mt-1">
                Graduated {education.yearGraduated}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleDeleteClick}
          className="p-2 text-slate-400 hover:text-red-500 transition flex-shrink-0 ml-2 cursor-pointer"
          title="Delete education"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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
