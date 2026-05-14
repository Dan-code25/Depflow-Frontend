import { getMySchedule } from "./scheduleService";
import { getAnnouncements } from "./announcementService";
import { formatTimeRange } from "../utils/timeFormatter";
import api from "./api";
import type { Announcement } from "../types/profile";

export interface DashboardScheduleItem {
  id: string;
  room: string;
  course: string;
  section: string;
  subject: string;
  time: string;
}

/**
 * Fetch today's schedule for the current user
 * Filters schedule data for today's day of week
 */
export async function getTodaySchedule(): Promise<DashboardScheduleItem[]> {
  try {
    const today = new Date();
    const todayDayOfWeek = today.toLocaleDateString("en-US", {
      weekday: "short",
    });

    const scheduleData = await getMySchedule();

    if (!scheduleData || !Array.isArray(scheduleData)) {
      return [];
    }

    // Filter schedule for today's day of week
    const todaySchedules = scheduleData
      .filter((item: any) => {
        const dayMatch =
          item.day?.substring(0, 3).toUpperCase() ===
          todayDayOfWeek.toUpperCase();
        return dayMatch;
      })
      .map((item: any) => ({
        id: item.id || `${item.subjectCode}-${item.section}`,
        room: item.room || "N/A",
        course: item.subjectCode || "",
        section: item.section || "",
        subject: item.subjectName || "",
        time: formatTimeRange(item.startTime, item.endTime) || "",
      }));

    return todaySchedules;
  } catch (error) {
    console.error("Error fetching today's schedule:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to fetch today's schedule");
  }
}

/**
 * Fetch latest announcements
 * Returns all announcements from the backend
 */
export async function getDashboardAnnouncements(): Promise<Announcement[]> {
  try {
    const announcements = await getAnnouncements();
    return announcements || [];
  } catch (error) {
    console.error("Error fetching announcements:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to fetch announcements");
  }
}

/**
 * Fetch total count of subjects in the system
 */
export async function getTotalSubjectsCount(): Promise<number> {
  try {
    const response = await api.get("/subjects/count");
    return response.data?.count || 0;
  } catch (error) {
    console.error("Error fetching total subjects count:", error);
    return 0;
  }
}

/**
 * Fetch count of my assigned subjects
 * Based on current user's schedule
 */
export async function getMySubjectsCount(): Promise<number> {
  try {
    const scheduleData = await getMySchedule();

    if (!scheduleData || !Array.isArray(scheduleData)) {
      return 0;
    }

    // Get unique subjects from schedule
    const uniqueSubjects = new Set(
      scheduleData.map((item: any) => item.subjectCode),
    );

    return uniqueSubjects.size;
  } catch (error) {
    console.error("Error fetching my subjects count:", error);
    return 0;
  }
}

/**
 * Fetch count of draft schedules
 */
export async function getDraftSchedulesCount(): Promise<number> {
  try {
    const response = await api.get("/schedules/draft/count");
    return response.data?.count || 0;
  } catch (error) {
    console.error("Error fetching draft schedules count:", error);
    return 0;
  }
}

/**
 * Fetch load units for current user
 */
export async function getLoadUnits(): Promise<{
  currentUnits: number;
  maxUnits: number;
}> {
  try {
    const response = await api.get("/schedules/load-units");
    return {
      currentUnits: response.data?.currentUnits || 0,
      maxUnits: response.data?.maxUnits || 24,
    };
  } catch (error) {
    console.error("Error fetching load units:", error);
    return {
      currentUnits: 0,
      maxUnits: 24,
    };
  }
}
