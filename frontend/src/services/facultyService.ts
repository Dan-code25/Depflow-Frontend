import api from "./api";
import {
  mapBackendFaculty,
  mapToBackendFaculty,
  type BackendFaculty,
} from "../utils/facultyMapper";
import type { AddFacultyFormData } from "../types/faculty";

export const getAllFaculty = async () => {
  try {
    const response = await api.get("/faculty/all");
    console.log("Raw response:", response.data);
    // Map backend response to frontend format
    const mapped = response.data.map((item: BackendFaculty) => {
      const faculty = mapBackendFaculty(item);
      console.log("Mapping:", item, "→", faculty);
      return faculty;
    });
    console.log("All mapped faculty:", mapped);
    return mapped;
  } catch (error) {
    console.error("Error fetching faculty information:", error);
    throw error;
  }
};

export const getFacultyById = async (facultyId: string) => {
  try {
    const response = await api.get(`/faculty/profile/${facultyId}`);
    return mapBackendFaculty(response.data);
  } catch (error) {
    console.error("Error fetching faculty:", error);
    throw error;
  }
};

export const addFaculty = async (facultyData: AddFacultyFormData) => {
  try {
    // Debug: Log form data to check field names
    console.log("Form data received:", facultyData);

    // Map frontend format to backend format
    const backendData = mapToBackendFaculty(facultyData);
    console.log("Backend data to send:", backendData);

    const response = await api.post("/faculty/add-faculty", backendData);
    // Map backend response to frontend format
    return mapBackendFaculty(response.data);
  } catch (error) {
    console.error("Error adding faculty:", error);
    throw error;
  }
};

export const deleteFaculty = async (facultyId: string) => {
  try {
    await api.delete(`/faculty/delete/${facultyId}`);
  } catch (error) {
    console.error("Error deleting faculty:", error);
    throw error;
  }
};

export const getFacultyLoadUnits = async (facultyId: string) => {
  try {
    const response = await api.get(`/faculty/load-units/${facultyId}`);
    console.log("Load units response:", response.data);
    return {
      currentUnits: response.data?.currentUnits || 0,
      maxUnits: response.data?.maxUnits || 24,
    };
  } catch (error) {
    console.error("Error fetching faculty load units:", error);
    return {
      currentUnits: 0,
      maxUnits: 24,
    };
  }
};
