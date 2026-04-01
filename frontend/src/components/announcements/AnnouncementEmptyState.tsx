import { Megaphone } from "lucide-react";

interface AnnouncementEmptyStateProps {
  message?: string;
}

export function AnnouncementEmptyState({
  message = "No announcements yet.",
}: AnnouncementEmptyStateProps) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg shadow-sm border border-slate-200 p-12 text-center">
      <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <p className="text-slate-500 font-medium">{message}</p>
    </div>
  );
}
