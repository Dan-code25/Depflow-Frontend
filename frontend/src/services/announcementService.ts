import api from "./api";
import type { Announcement } from "../types/profile";

// Fetch all announcements
export const getAnnouncements = async () => {
  try {
    const response = await api.get("/announcements/get-announcements");
    const data = response.data;

    const announcements: Announcement[] = (data || []).map((item: any) => {
      // Map file_urls to attachments array
      let attachments: any[] = [];
      if (item.file_urls && Array.isArray(item.file_urls)) {
        attachments = item.file_urls.map((url: string, idx: number) => ({
          id: `file-${idx}`,
          filename: (url.split('/').pop() || `file-${idx}`).replace(/^\d+_/, ''),
          url: url,
        }));
      } else if (item.attachments) {
        attachments = item.attachments;
      }

      return {
        id: item.id?.toString() || item.announcement_id?.toString(),
        title: item.title,
        content: item.content,
        createdBy: item.createdBy,
        firstName: item.faculty_profiles?.first_name,
        lastName: item.faculty_profiles?.last_name,
        createdAt: item.createdAt || item.created_at,
        updatedAt: item.updatedAt || item.updated_at,
        attachments: attachments,
      };
    });

    return announcements;
  } catch (error) {
    console.error("Error fetching announcements:", error);
    throw error;
  }
};

// Create announcement with files
export const createAnnouncement = async (
  announcement: Announcement,
  files?: File[],
) => {
  try {
    const formData = new FormData();
    formData.append("title", announcement.title);
    formData.append("content", announcement.content);
    formData.append("announcement_date", new Date().toISOString().split('T')[0]);
    if (announcement.createdBy) {
      formData.append("createdBy", announcement.createdBy);
    }

    // Add files if provided
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    }

    const response = await api.post("/announcements/add-announcement", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // Handle Supabase array response or null
    let announcement_ = response.data;
    if (Array.isArray(response.data) && response.data.length > 0) {
      announcement_ = response.data[0];
    }

    // Map file_urls to attachments array
    if (announcement_ && announcement_.file_urls && Array.isArray(announcement_.file_urls)) {
      announcement_.attachments = announcement_.file_urls.map((url: string, idx: number) => ({
        id: `file-${idx}`,
        filename: (url.split('/').pop() || `file-${idx}`).replace(/^\d+_/, ''),
        url: url,
      }));
    }

    // Map backend firstName/lastName fields from nested faculty_profiles
    if (announcement_) {
      announcement_.firstName = announcement_.faculty_profiles?.first_name;
      announcement_.lastName = announcement_.faculty_profiles?.last_name;
      // Ensure id is properly mapped from either 'id' or 'announcement_id'
      if (!announcement_.id && announcement_.announcement_id) {
        announcement_.id = announcement_.announcement_id;
      }
    }

    return announcement_;
  } catch (error) {
    console.error("Error creating announcement:", error);
    throw error;
  }
};

// Delete announcement (admin only)
export const deleteAnnouncement = async (id: string) => {
  try {
    const response = await api.delete(`/announcements/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting announcement:", error);
    throw error;
  }
};

// Update announcement with files
export const updateAnnouncement = async (
  id: string,
  announcement: Announcement,
  files?: File[],
) => {
  try {
    const formData = new FormData();
    formData.append("title", announcement.title);
    formData.append("content", announcement.content);
    formData.append("announcement_date", new Date().toISOString().split('T')[0]);
    if (announcement.createdBy) {
      formData.append("createdBy", announcement.createdBy);
    }

    // Add files if provided
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    }

    const response = await api.patch(`/announcements/edit/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // Handle Supabase array response or null
    let announcement_ = response.data;
    if (Array.isArray(response.data) && response.data.length > 0) {
      announcement_ = response.data[0];
    }

    // Map file_urls to attachments array
    if (announcement_ && announcement_.file_urls && Array.isArray(announcement_.file_urls)) {
      announcement_.attachments = announcement_.file_urls.map((url: string, idx: number) => ({
        id: `file-${idx}`,
        filename: (url.split('/').pop() || `file-${idx}`).replace(/^\d+_/, ''),
        url: url,
      }));
    }

    // Map backend firstName/lastName fields from nested faculty_profiles
    if (announcement_) {
      announcement_.firstName = announcement_.faculty_profiles?.first_name;
      announcement_.lastName = announcement_.faculty_profiles?.last_name;
      // Ensure id is properly mapped from either 'id' or 'announcement_id'
      if (!announcement_.id && announcement_.announcement_id) {
        announcement_.id = announcement_.announcement_id;
      }
    }

    return announcement_;
  } catch (error) {
    console.error("Error updating announcement:", error);
    throw error;
  }
};
