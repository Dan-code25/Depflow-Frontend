import { useState } from "react";
import EducationCard from "./EducationCard";
import EducationModal from "./EducationModal";
import AddButton from "../common/AddButton";
import type { Education } from "../../types/profile";

interface EducationTabProps {
  educations: Education[];
  onAdd?: (education: Education) => void;
  onDelete?: (id: string | undefined) => void;
  readOnly?: boolean;
}

export default function EducationTab({
  educations,
  onAdd,
  onDelete,
  readOnly = false,
}: EducationTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (education: Education) => {
    onAdd?.(education);
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8">
      <h3 className="text-xs sm:text-sm font-bold text-burgundy uppercase mb-6">
        Educational Background
      </h3>

      <div className="space-y-4 mb-6">
        {educations.length === 0 ? (
          <p className="text-slate-500 text-center py-4">
            No education records yet
          </p>
        ) : (
          educations.map((education) => (
            <EducationCard
              key={education.edId}
              education={education}
              onDelete={!readOnly ? onDelete : undefined}
            />
          ))
        )}
      </div>

      {!readOnly && onAdd && (
        <>
          <AddButton
            label="Add Education"
            onClick={() => setIsModalOpen(true)}
          />

          <EducationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  );
}
