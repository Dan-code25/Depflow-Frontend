import type { Availability } from "../../types/profile";
import AvailabilityForm from "./AvailabilityForm";
import AvailabilityDisplay from "./AvailabilityDisplay";

interface AvailabilityTabProps {
  availability: Availability | null;
  onSave: (availability: Omit<Availability, "id" | "createdAt" | "updatedAt">) => void;
  onDelete?: () => void;
  isLoading?: boolean;
  readOnly?: boolean;
}

export default function AvailabilityTab({
  availability,
  onSave,
  onDelete,
  isLoading = false,
  readOnly = false,
}: AvailabilityTabProps) {
  if (!readOnly && !availability) {
    // Show form for adding new availability
    return (
      <AvailabilityForm
        availability={null}
        onSave={onSave}
        isLoading={isLoading}
      />
    );
  }

  if (readOnly && !availability) {
    // Read-only mode with no availability set
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8">
        <h3 className="text-xs sm:text-sm font-bold text-burgundy uppercase mb-4">
          Teaching Availability
        </h3>
        <p className="text-slate-500 text-center py-8">
          No availability information provided
        </p>
      </div>
    );
  }

  if (availability && readOnly) {
    // Read-only display of existing availability
    return <AvailabilityDisplay availability={availability} />;
  }

  // Edit existing availability
  return (
    <AvailabilityForm
      availability={availability}
      onSave={onSave}
      onDelete={onDelete}
      isLoading={isLoading}
    />
  );
}
