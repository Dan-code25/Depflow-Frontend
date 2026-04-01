import { useState } from "react";
import { Calendar } from "lucide-react";

interface AnnouncementFilterProps {
  onFilterChange: (dateFilter: DateFilter) => void;
}

export type DateFilter = "all" | "today" | "week" | "month" | "year";

const filterOptions: { label: string; value: DateFilter }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
];

export function AnnouncementFilter({
  onFilterChange,
}: AnnouncementFilterProps) {
  const [activeFilter, setActiveFilter] = useState<DateFilter>("all");

  const handleFilterChange = (filter: DateFilter) => {
    setActiveFilter(filter);
    onFilterChange(filter);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar size={18} className="text-slate-500" />
      <span className="text-sm font-medium text-slate-600">Filter:</span>
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleFilterChange(option.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              activeFilter === option.value
                ? "bg-burgundy text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
