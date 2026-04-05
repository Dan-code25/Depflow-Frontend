import { FacultyCard } from "./FacultyCard";
import type { Faculty } from "../../types/faculty";

interface FacultyGridProps {
  faculty: Faculty[];
  onViewProfile: (faculty: Faculty) => void;
  onDeleteClick?: (faculty: Faculty) => void;
  isAdmin?: boolean;
}

export function FacultyGrid({
  faculty,
  onViewProfile,
  onDeleteClick,
  isAdmin = false,
}: FacultyGridProps) {
  if (faculty.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 px-4">
        <div className="text-center">
          <p className="text-lg text-slate-600 font-medium mb-2">
            No faculty members found
          </p>
          <p className="text-slate-500 text-sm">
            Try adjusting your filters or add new faculty members
          </p>
        </div>
      </div>
    );
  }

  // Filter out items with invalid IDs and log for debugging
  const validFaculty = faculty.filter((f) => {
    if (!f.id) {
      console.warn("Faculty member with missing ID:", f);
      return false;
    }
    return true;
  });

  if (validFaculty.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 px-4">
        <div className="text-center">
          <p className="text-lg text-slate-600 font-medium mb-2">
            No valid faculty members found
          </p>
          <p className="text-slate-500 text-sm">
            There was an issue loading faculty data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {validFaculty.map((member) => (
        <FacultyCard
          key={member.id}
          faculty={member}
          onViewProfile={onViewProfile}
          onDeleteClick={onDeleteClick}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
