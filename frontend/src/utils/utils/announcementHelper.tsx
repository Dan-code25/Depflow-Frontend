import { Bell, AlertCircle, Calendar, BookOpen } from "lucide-react";
import type { AnnouncementTag, AnnouncementAudience, FilterTag } from "../types/announcement";

export const TAG_STYLES: Record<
  AnnouncementTag,
  { badge: string; border: string; icon: React.ReactNode }
> = {
  General:  { badge: "bg-blue-100 text-blue-700",   border: "border-l-blue-400",   icon: <BookOpen size={11} />    },
  Reminder: { badge: "bg-amber-100 text-amber-700", border: "border-l-amber-400",  icon: <Bell size={11} />        },
  Urgent:   { badge: "bg-red-100 text-red-600",     border: "border-l-red-400",    icon: <AlertCircle size={11} /> },
  Event:    { badge: "bg-green-100 text-green-700", border: "border-l-green-400",  icon: <Calendar size={11} />    },
};

export const AUDIENCE_OPTIONS: AnnouncementAudience[] = [
  "All Faculty",
  "Full-time",
  "Part-time",
];

export const FILTER_TAGS: FilterTag[] = [
  "All",
  "General",
  "Reminder",
  "Urgent",
  "Event",
];


export function formatDateLong(d: string): string {
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export function formatDateShort(d: string): string {
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}