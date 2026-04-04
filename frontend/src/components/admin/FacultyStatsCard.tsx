import { Users } from "lucide-react";
import type { Faculty } from "../../types/faculty";

interface FacultyStatsCardProps {
  faculty: Faculty[];
}

export function FacultyStatsCard({ faculty }: FacultyStatsCardProps) {
  // Calculate stats
  const totalFaculty = faculty.length;
  const statsByGroup = faculty.reduce(
    (acc, f) => {
      acc[f.coreGroup] = (acc[f.coreGroup] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const coreGroups = ["IT CORE", "CS CORE", "IS CORE", "General Education"];

  const stats = [
    { label: "Total Faculty", value: totalFaculty, isTotalCard: true },
    ...coreGroups.map((group) => ({
      label: group,
      value: statsByGroup[group] || 0,
      isTotalCard: false,
    })),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`rounded-lg shadow-sm border p-6 flex flex-col items-center justify-center text-center transition-shadow hover:shadow-md ${
            stat.isTotalCard
              ? "bg-gradient-to-br from-burgundy to-burgundy/90 border-burgundy/20"
              : "bg-white border-slate-200"
          }`}
        >
          {stat.isTotalCard && (
            <div className="mb-3">
              <Users size={28} className="text-white" />
            </div>
          )}
          <p
            className={`text-sm font-medium mb-2 ${stat.isTotalCard ? "text-white/80" : "text-slate-600"}`}
          >
            {stat.label}
          </p>
          <p
            className={`text-4xl font-bold ${stat.isTotalCard ? "text-white" : "text-burgundy"}`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
