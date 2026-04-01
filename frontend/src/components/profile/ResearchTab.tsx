import { useState } from "react";
import ResearchCard from "./ResearchCard";
import AddResearchModal from "./AddResearchModal";
import AddButton from "../common/AddButton";
import type { Research } from "../../types/profile";

interface ResearchTabProps {
  researches: Research[];
  onAdd: (research: Research) => void;
  onDelete: (id: string | undefined) => void;
}

export default function ResearchTab({
  researches,
  onAdd,
  onDelete,
}: ResearchTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (research: Research) => {
    onAdd(research);
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8">
      <h3 className="text-xs sm:text-sm font-bold text-burgundy uppercase mb-6">
        Research & Publications
      </h3>

      <div className="space-y-4 mb-6">
        {researches.length === 0 ? (
          <p className="text-slate-500 text-center py-4 text-sm">
            No research records yet
          </p>
        ) : (
          researches.map((research, index) => (
            <ResearchCard
              key={research.researchId || `${research.title}-${index}`}
              research={research}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <AddButton label="Add Research" onClick={() => setIsModalOpen(true)} />

      <AddResearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
