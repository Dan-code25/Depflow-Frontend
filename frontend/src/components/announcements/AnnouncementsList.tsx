import type { Announcement } from "../../types/profile";
import { AnnouncementCard } from "./AnnouncementCard";
import { AnnouncementEmptyState } from "./AnnouncementEmptyState";

interface AnnouncementListProps {
  announcements: Announcement[];
  isReadOnly?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (announcement: Announcement) => void;
  selectedDate?: Date | null;
}

function filterAnnouncementsByDate(
  announcements: Announcement[],
  selectedDate: Date | null,
): Announcement[] {
  if (!selectedDate) return announcements;

  return announcements.filter((announcement) => {
    if (!announcement.createdAt) return false;

    const announcementDate = new Date(announcement.createdAt);
    const filterDate = new Date(selectedDate);

    return (
      announcementDate.getFullYear() === filterDate.getFullYear() &&
      announcementDate.getMonth() === filterDate.getMonth() &&
      announcementDate.getDate() === filterDate.getDate()
    );
  });
}

export function AnnouncementsList({
  announcements,
  isReadOnly = false,
  onDelete,
  onEdit,
  selectedDate = null,
}: AnnouncementListProps) {
  const filteredAnnouncements = filterAnnouncementsByDate(
    announcements,
    selectedDate,
  ).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  if (filteredAnnouncements.length === 0) {
    return (
      <AnnouncementEmptyState
        message={
          selectedDate
            ? "No announcements found for the selected date."
            : "No announcements yet."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {filteredAnnouncements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onDelete={onDelete}
          onEdit={onEdit}
          isReadOnly={isReadOnly}
        />
      ))}
    </div>
  );
}
