import { useEffect, useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { AnnouncementHeader } from "../../components/announcements/AnnouncementHeader";
import { AnnouncementModal } from "../../components/announcements/AnnouncementModal";
import { AnnouncementCalendarFilter } from "../../components/announcements/AnnouncementCalendarFilter";
import { AnnouncementSearch } from "../../components/announcements/AnnouncementSearch";
import { AnnouncementsList } from "../../components/announcements/AnnouncementsList";
import type { Announcement } from "../../types/profile";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
  getAnnouncements,
} from "../../services/announcementService";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

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
        const data = await getAnnouncements();
        if (data && data.length > 0) {
          setAnnouncements(data);
        }
      } catch (err) {
        console.error("Failed to fetch announcements:", err);
        setError("Failed to load announcements");
      }
    };
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (
    announcement: Omit<Announcement, "id" | "createdAt" | "updatedAt">,
    files?: File[],
  ) => {
    try {
      setIsSaving(true);
      setError("");

      if (editingAnnouncement) {
        // Update existing announcement
        const response = await updateAnnouncement(
          editingAnnouncement.id!,
          announcement,
          files,
        );

        if (!response) {
          throw new Error("Failed to update announcement: no response from server");
        }

        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === editingAnnouncement.id
              ? {
                  ...a,
                  title: announcement.title,
                  content: announcement.content,
                  firstName: response.firstName,
                  lastName: response.lastName,
                  createdAt: response.createdAt || a.createdAt,
                  updatedAt: response.updatedAt || new Date().toISOString(),
                  attachments: response.attachments || [],
                }
              : a,
          ),
        );
        setSuccess("Announcement updated successfully!");
      } else {
        // Create new announcement
        const response = await createAnnouncement(announcement, files);

        if (!response) {
          throw new Error("Failed to create announcement: no response from server");
        }

        const newAnnouncement: Announcement = {
          id: response.id?.toString() || Date.now().toString(),
          title: announcement.title,
          content: announcement.content,
          createdBy: announcement.createdBy,
          firstName: response.firstName,
          lastName: response.lastName,
          createdAt: response.createdAt || new Date().toISOString(),
          updatedAt: response.updatedAt || new Date().toISOString(),
          attachments: response.attachments || [],
        };

        setAnnouncements([newAnnouncement, ...announcements]);
        setSuccess("Announcement created successfully!");
      }

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to save announcement:", err);
      throw new Error("Failed to save announcement. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setSuccess("Announcement deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      setError("Failed to delete announcement. Please try again.");
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container-main">
          <AnnouncementHeader
            title="Announcements"
            description="Create and manage announcements for faculty members"
          />
        </div>

        <div className="container-main flex flex-col gap-6 py-8">
          {/* Alert Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm font-medium flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm font-medium flex items-center gap-2">
              <span>✓</span> {success}
            </div>
          )}

          {/* Search and Filter Section with Create Button */}
          <div className="space-y-3">
            <div className="flex gap-3 items-stretch flex-col sm:flex-row">
              <div className="flex-1">
                <AnnouncementSearch
                  onSearchChange={setSearchQuery}
                  placeholder="Search announcements..."
                />
              </div>
              <button
                onClick={() => {
                  setEditingAnnouncement(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-3 bg-gradient-to-r from-burgundy to-burgundy/90 hover:from-burgundy/90 hover:to-burgundy/80 text-white rounded-lg transition-all duration-200 font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg whitespace-nowrap cursor-pointer"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Create</span>
              </button>
            </div>
            <div className="flex justify-start">
              <AnnouncementCalendarFilter
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>
          </div>

          {/* Announcements List */}
          {false ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <AnnouncementsList
              announcements={searchFilteredAnnouncements}
              onDelete={handleDelete}
              onEdit={handleEdit}
              isReadOnly={false}
              selectedDate={selectedDate}
            />
          )}
        </div>
      </div>

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAnnouncement(null);
        }}
        onSubmit={handleCreateAnnouncement}
        isLoading={isSaving}
        editingAnnouncement={editingAnnouncement}
      />
    </AdminLayout>
  );
}
