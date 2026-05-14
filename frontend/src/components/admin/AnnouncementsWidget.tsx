import { useState, useEffect } from "react";
import { Megaphone, ArrowRight, Calendar, User, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDashboardAnnouncements } from "../../services/dashboardService";
import type { Announcement } from "../../types/profile";

interface AnnouncementsWidgetProps {
  announcements?: Announcement[];
  isLoading?: boolean;
}

export function AnnouncementsWidget({
  announcements: initialAnnouncements = [],
  isLoading: initialIsLoading = false,
}: AnnouncementsWidgetProps) {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] =
    useState<Announcement[]>(initialAnnouncements);
  const [isLoading, setIsLoading] = useState(initialIsLoading);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setIsLoading(true);

    try {
      const data = await getDashboardAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm h-full">
      <div className="flex items-center gap-3 mb-6">
        <Megaphone size={20} className="text-burgundy" />
        <h3 className="text-lg font-bold text-charcoal">Announcements</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={40} className="text-burgundy animate-spin" />
        </div>
      ) : announcements.length > 0 ? (
        <>
          <div className="space-y-4 mb-6">
            {announcements.slice(0, 2).map((announcement) => (
              <div
                key={announcement.id}
                className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
              >
                {/* Left Accent Bar */}
                <div className="flex">
                  <div className="w-1 bg-gradient-to-b from-burgundy to-burgundy/60" />

                  <div className="flex-1 p-4">
                    {/* Title, Content, and Meta Info */}
                    <h4 className="text-sm font-bold text-charcoal leading-snug line-clamp-2 mb-2">
                      {announcement.title}
                    </h4>

                    {/* Content */}
                    <p className="text-slate-700 text-xs leading-relaxed mb-3 whitespace-pre-wrap break-words line-clamp-3">
                      {announcement.content}
                    </p>

                    {/* Attachments */}
                    {announcement.attachments &&
                      announcement.attachments.length > 0 && (
                        <div className="mb-3 p-2 bg-slate-50 rounded-md border border-slate-200">
                          <p className="text-xs font-semibold text-slate-600 mb-1.5">
                            Attachments ({announcement.attachments.length})
                          </p>
                          <div className="space-y-1">
                            {announcement.attachments.map((attachment, idx) => (
                              <a
                                key={idx}
                                href={attachment.url}
                                download={attachment.filename}
                                className="flex items-center gap-2 text-xs text-burgundy hover:text-burgundy/80 transition-colors cursor-pointer"
                              >
                                <span>📎</span>
                                <span className="truncate hover:underline">
                                  {attachment.filename}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Meta Information */}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 border-t border-slate-100 pt-2">
                      {(announcement.firstName || announcement.lastName) && (
                        <div className="flex items-center gap-1">
                          <User size={12} className="text-slate-400" />
                          <span className="font-medium">
                            {announcement.firstName} {announcement.lastName}
                          </span>
                        </div>
                      )}
                      {announcement.createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>
                            {new Date(
                              announcement.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View All Button */}
          <button
            onClick={() => navigate("/admin/announcements")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-burgundy text-burgundy rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
          >
            View All Announcements
            <ArrowRight size={16} />
          </button>
        </>
      ) : (
        <div className="text-center py-8">
          <Megaphone size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No announcements yet</p>
        </div>
      )}
    </div>
  );
}
