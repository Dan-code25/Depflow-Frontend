import type { Availability } from "../types/profile";
import type { Subject } from "../utils/availabilityConstants";

import api from "./api";

/**
 * Fetch all available subjects
 */
export const getSubjects = async (): Promise<Subject[]> => {
  try {
    const response = await api.get("/subjects");
    // Transform backend response to match Subject interface
    return response.data.map((subject: any) => ({
      id: subject.subject_code,
      name: subject.subject_name,
    }));
  } catch (error) {
    console.error("Error fetching subjects:", error);
    throw error;
  }
};

/**
 * Fetch faculty availability (single form for current user)
 */
export const getAvailability = async (): Promise<Availability | null> => {
  try {
    const response = await api.get("/availability/get");
    console.log("Fetched availability:", response.data);
    if (!response.data) return null;
    // Ensure proper format from backend
    return {
      facultyId: response.data.facultyId || "",
      priority: response.data.priority || "medium",
      maxClassesPerDay: response.data.maxClassesPerDay || 3,
      maxConsecutiveHours: response.data.maxConsecutiveHours || 4,
      timeStart: response.data.timeStart || "07:00",
      timeEnd: response.data.timeEnd || "19:00",
      preferredDays: response.data.preferredDays || [],
      unavailableDays: response.data.unavailableDays || [],
      preferredRoomTypes: response.data.preferredRoomTypes || [],
      unavailableTimeSlots: response.data.unavailableTimeSlots || [],
      subjectSpecializations: response.data.subjectSpecializations || [],
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching availability:", error);
    return null;
  }
};

/**
 * Save or update availability (single form)
 */
export const saveAvailability = async (
  availability: Omit<Availability, "createdAt" | "updatedAt">,
): Promise<Availability> => {
  try {
    const response = await api.post("/availability/save", availability);
    if (!response.data) throw new Error("No response data");
    return {
      facultyId: response.data.facultyId || "",
      priority: response.data.priority || "medium",
      maxClassesPerDay: response.data.maxClassesPerDay || 3,
      maxConsecutiveHours: response.data.maxConsecutiveHours || 4,
      timeStart: response.data.timeStart || "07:00",
      timeEnd: response.data.timeEnd || "19:00",
      preferredDays: response.data.preferredDays || [],
      unavailableDays: response.data.unavailableDays || [],
      preferredRoomTypes: response.data.preferredRoomTypes || [],
      unavailableTimeSlots: response.data.unavailableTimeSlots || [],
      subjectSpecializations: response.data.subjectSpecializations || [],
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt,
    };
  } catch (error) {
    console.error("Error saving availability:", error);
    throw error;
  }
};

/**
 * Delete availability
 */
export const deleteAvailability = async (): Promise<void> => {
  try {
    await api.delete("/availability/delete");
  } catch (error) {
    console.error("Error deleting availability:", error);
    throw error;
  }
};

/**
 * Fetch availability for specific faculty (for viewing other faculty profiles)
 */
export const getFacultyAvailability = async (
  facultyId: string,
): Promise<Availability | null> => {
  try {
    const response = await api.get(
      `/faculty/availability/faculty/${facultyId}`,
    );
    console.log("Fetched faculty availability:", response.data);
    if (!response.data) return null;
    return {
      facultyId: response.data.facultyId || "",
      priority: response.data.priority || "medium",
      maxClassesPerDay: response.data.maxClassesPerDay || 3,
      maxConsecutiveHours: response.data.maxConsecutiveHours || 4,
      timeStart: response.data.timeStart || "07:00",
      timeEnd: response.data.timeEnd || "19:00",
      preferredDays: response.data.preferredDays || [],
      unavailableDays: response.data.unavailableDays || [],
      preferredRoomTypes: response.data.preferredRoomTypes || [],
      unavailableTimeSlots: response.data.unavailableTimeSlots || [],
      subjectSpecializations: response.data.subjectSpecializations || [],
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching faculty availability:", error);
    return null;
  }
};

export default {
  getSubjects,
  getAvailability,
  saveAvailability,
  deleteAvailability,
  getFacultyAvailability,
};
