import { CalendarDays, Plus, Sparkles, Users } from "lucide-react";

interface SchedulePageHeaderProps {
  activeSem: { schoolYear: string; sem: 1 | 2 };
  onSchoolYearChange: (year: string) => void;
  onSemChange: (sem: 1 | 2) => void;
  hasExistingSections: boolean;
  hasExistingSchedules: boolean;
  generating: boolean;
  scanning: boolean;
  onSetupSections: () => void;
  onGenerate: () => void;
  onAddAssignment: () => void;
}

export function SchedulePageHeader({
  activeSem,
  onSchoolYearChange,
  onSemChange,
  hasExistingSections,
  hasExistingSchedules,
  generating,
  scanning,
  onSetupSections,
  onGenerate,
  onAddAssignment,
}: SchedulePageHeaderProps) {
  return (
    <div className="bg-white p-6 sm:p-8 mb-8 border border-slate-200 rounded-lg shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays size={32} className="text-burgundy" />
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">
            Manage Schedule
          </h1>
        </div>
        <p className="text-slate-600 text-sm sm:text-base ml-11">
          Draft assignments or generate automatically. Resolve conflicts contextually.
        </p>
      </div>

      {/* Controls */}
      <div className="w-full xl:w-auto flex flex-col items-end gap-3 shrink-0">
        {/* SY / Semester Selector */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 w-full sm:w-auto justify-end">
          <CalendarDays size={14} className="text-gray-500 shrink-0" />
          <span className="text-xs font-semibold text-gray-700 shrink-0">
            Generating for:
          </span>
          <select
            className="text-xs font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer"
            value={activeSem.schoolYear}
            onChange={(e) => onSchoolYearChange(e.target.value)}
          >
            {["2023-2024", "2024-2025", "2025-2026"].map((sy) => (
              <option key={sy} value={sy}>
                {sy}
              </option>
            ))}
          </select>
          <span className="text-gray-300">·</span>
          <select
            className="text-xs font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer"
            value={activeSem.sem}
            onChange={(e) => onSemChange(Number(e.target.value) as 1 | 2)}
          >
            <option value={1}>1st Semester</option>
            <option value={2}>2nd Semester</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap justify-end w-full sm:w-auto">
          {/* Setup Sections */}
          <button
            onClick={onSetupSections}
            disabled={hasExistingSections}
            title={
              hasExistingSections
                ? "Sections already exist for this term."
                : "Setup new sections"
            }
            className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold shadow-sm transition-colors flex-1 sm:flex-none ${
              hasExistingSections
                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
            }`}
          >
            <Users size={15} /> Setup Sections
          </button>

          {/* Generate Schedule */}
          <button
            onClick={onGenerate}
            disabled={generating || scanning || hasExistingSchedules}
            title={
              hasExistingSchedules
                ? "Schedules already exist for this term. Please delete them to regenerate."
                : "Auto-generate schedule"
            }
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 sm:flex-none ${
              generating || scanning || hasExistingSchedules
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
            }`}
          >
            <Sparkles size={15} />
            {generating ? "Generating..." : "Generate Schedule"}
          </button>

          {/* Add Assignment */}
          <button
            onClick={onAddAssignment}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8B0000] hover:bg-[#6B0000] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#8B0000]/20 transition-colors flex-1 sm:flex-none"
          >
            <Plus size={15} /> Add Assignment
          </button>
        </div>
      </div>
    </div>
  );
}