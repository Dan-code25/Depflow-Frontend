export type AnnouncementTag =
  | "General"
  | "Reminder"
  | "Urgent"
  | "Event";

export type AnnouncementAudience =
  | "All Faculty"
  | "Full-time"
  | "Part-time";

export type FilterTag =
  | "All"
  | AnnouncementTag;