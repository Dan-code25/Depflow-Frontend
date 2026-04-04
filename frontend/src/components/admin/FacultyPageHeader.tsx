import { Users } from "lucide-react";

interface FacultyPageHeaderProps {
  title: string;
  description: string;
}

export function FacultyPageHeader({
  title,
  description,
}: FacultyPageHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 mb-6 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <Users size={28} className="text-burgundy" />
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">
          {title}
        </h1>
      </div>
      <p className="text-slate-600 text-sm sm:text-base ml-11">{description}</p>
    </div>
  );
}
