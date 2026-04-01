import { Megaphone } from "lucide-react";

interface AnnouncementHeaderProps {
  title: string;
  description?: string;
}

export function AnnouncementHeader({
  title,
  description,
}: AnnouncementHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 mb-8 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <Megaphone size={28} className="text-burgundy" />
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">{title}</h1>
      </div>
      {description && (
        <p className="text-slate-600 text-sm sm:text-base ml-11">
          {description}
        </p>
      )}
    </div>
  );
}
