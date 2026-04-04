import { Plus, Building2, Briefcase, Filter } from "lucide-react";
import type {
  CoreGroupFilter,
  EmploymentTypeFilter,
} from "../../types/faculty";
import { CORE_GROUPS, EMPLOYMENT_TYPES } from "../../constants/faculty";
import {
  getFilterButtonClass,
  getEmploymentSelectClass,
  getFilterLabelClass,
} from "../../utils/facultyFilters";

interface FacultyFilterBarProps {
  selectedFilter: CoreGroupFilter;
  onFilterChange: (filter: CoreGroupFilter) => void;
  selectedEmploymentFilter: EmploymentTypeFilter;
  onEmploymentFilterChange: (filter: EmploymentTypeFilter) => void;
  isAdmin: boolean;
  onAddClick: () => void;
}

export function FacultyFilterBar({
  selectedFilter,
  onFilterChange,
  selectedEmploymentFilter,
  onEmploymentFilterChange,
  isAdmin,
  onAddClick,
}: FacultyFilterBarProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
      {/* Filters Card */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          {/* Filter Header + Filters */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            {/* Filter Header */}
            <div className="flex items-center gap-2 pb-0 lg:pb-2 border-b lg:border-b-0 border-slate-200 lg:border-r lg:border-slate-300 lg:pr-6">
              <Filter size={20} className="text-burgundy" />
              <h3 className="text-sm font-bold text-charcoal uppercase tracking-wide">
                Filter
              </h3>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end gap-6">
              {/* Core Group Filter - Clickable Buttons */}
              <div className="flex flex-col gap-2">
                <label className={getFilterLabelClass()}>
                  <Building2 size={16} className="text-burgundy" />
                  Core Group
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onFilterChange("All")}
                    className={getFilterButtonClass(selectedFilter === "All")}
                  >
                    All
                  </button>
                  {CORE_GROUPS.map((group) => (
                    <button
                      key={group}
                      onClick={() => onFilterChange(group as CoreGroupFilter)}
                      className={getFilterButtonClass(selectedFilter === group)}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employment Type Filter - Dropdown */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="employmentFilter"
                  className={getFilterLabelClass()}
                >
                  <Briefcase size={16} className="text-burgundy" />
                  Employment Type
                </label>
                <select
                  id="employmentFilter"
                  value={selectedEmploymentFilter}
                  onChange={(e) =>
                    onEmploymentFilterChange(
                      e.target.value as EmploymentTypeFilter,
                    )
                  }
                  className={getEmploymentSelectClass()}
                >
                  <option value="All">All Employment Types</option>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Add Faculty Button (Admin Only) */}
          {isAdmin && (
            <button
              onClick={onAddClick}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-burgundy to-burgundy/90 hover:from-burgundy/90 hover:to-burgundy/80 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap text-base"
            >
              <Plus size={20} />
              <span>Add Faculty</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
