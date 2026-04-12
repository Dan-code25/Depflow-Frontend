import type { Availability } from "../types/profile";
import type { Subject } from "../utils/availabilityConstants";

import api from "./api";

/**
 * Fetch all available subjects
 */
export const getSubjects = async (): Promise<Subject[]> => {
  try {
    const response = await api.get("/subjects/get");
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
    return response.data || null;
  } catch (error) {
    console.error("Error fetching availability:", error);
    return null;
  }
};

/**
 * Save or update availability (single form)
 */
export const saveAvailability = async (
  availability: Omit<Availability, "id" | "createdAt" | "updatedAt">,
): Promise<Availability> => {
  try {
    const response = await api.post("/availability/save", availability);
    return response.data;
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
    const response = await api.get("/availability/get", {
      params: { facultyId },
    });
    return response.data || null;
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
