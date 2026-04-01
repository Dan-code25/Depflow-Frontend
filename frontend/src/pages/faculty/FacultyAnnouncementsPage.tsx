import { useState, useMemo, useEffect } from "react";
import { FacultyLayout } from "../../components/layout/FacultyLayout";
import { AnnouncementHeader } from "../../components/announcements/AnnouncementHeader";
import { AnnouncementCalendarFilter } from "../../components/announcements/AnnouncementCalendarFilter";
import { AnnouncementSearch } from "../../components/announcements/AnnouncementSearch";
import { AnnouncementsList } from "../../components/announcements/AnnouncementsList";
import type { Announcement } from "../../types/profile";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { getAnnouncements } from "../../services/announcementService";

export default function FacultyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter announcements by search query
  const searchFilteredAnnouncements = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return announcements.filter(
      (announcement) =>
        announcement.title.toLowerCase().includes(query) ||
        announcement.content.toLowerCase().includes(query),
    );
  }, [announcements, searchQuery]);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await getAnnouncements();
        if (data && data.length > 0) {
          setAnnouncements(data);
        }
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
        setError("Failed to load announcements");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <FacultyLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container-main">
          <AnnouncementHeader
            title="Announcements"
            description="View important announcements from administration"
          />
        </div>

        <div className="container-main flex flex-col gap-6 py-8">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm font-medium flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          {/* Search and Filter Section */}
          <div className="space-y-3">
            <div className="flex gap-3 items-stretch flex-col sm:flex-row">
              <div className="flex-1">
                <AnnouncementSearch
                  onSearchChange={setSearchQuery}
                  placeholder="Search announcements..."
                />
              </div>
            </div>
            <div className="flex justify-start">
              <AnnouncementCalendarFilter
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <AnnouncementsList
              announcements={searchFilteredAnnouncements}
              isReadOnly={true}
              selectedDate={selectedDate}
            />
          )}
        </div>
      </div>
    </FacultyLayout>
  );
}
