import type { Faculty, CoreGroupFilter, EmploymentTypeFilter } from "../../types/faculty";
import { FacultyStatsCard } from "./FacultyStatsCard";
import { FacultyPageHeader } from "./FacultyPageHeader";
import { FacultyFilterBar } from "./FacultyFilterBar";

interface FacultyHeaderProps {
  title: string;
  description: string;
  isAdmin: boolean;
  selectedFilter: CoreGroupFilter;
  onFilterChange: (filter: CoreGroupFilter) => void;
  selectedEmploymentFilter: EmploymentTypeFilter;
  onEmploymentFilterChange: (filter: EmploymentTypeFilter) => void;
  onAddClick: () => void;
  totalCount: number;
  faculty: Faculty[];
}

export function FacultyHeader({
  title,
  description,
  isAdmin,
  selectedFilter,
  onFilterChange,
  selectedEmploymentFilter,
  onEmploymentFilterChange,
  onAddClick,
  faculty,
}: FacultyHeaderProps) {
  return (
    <>
      {/* Page Header */}
      <FacultyPageHeader title={title} description={description} />

      {/* Stats Card */}
      <div className="mb-6">
        <FacultyStatsCard faculty={faculty} />
      </div>

      {/* Filter Bar */}
      <FacultyFilterBar
        selectedFilter={selectedFilter}
        onFilterChange={onFilterChange}
        selectedEmploymentFilter={selectedEmploymentFilter}
        onEmploymentFilterChange={onEmploymentFilterChange}
        isAdmin={isAdmin}
        onAddClick={onAddClick}
      />
    </>
  );
}
