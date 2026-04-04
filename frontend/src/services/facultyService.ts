import api from "./api";
import {
  mapBackendFaculty,
  mapToBackendFaculty,
  type BackendFaculty,
} from "../utils/facultyMapper";

export const getAllFaculty = async () => {
  try {
    const response = await api.get("/faculty-information/all");
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

export const addFaculty = async (facultyData: any) => {
  try {
    // Debug: Log form data to check field names
    console.log("Form data received:", facultyData);

    // Map frontend format to backend format
    const backendData = mapToBackendFaculty(facultyData);
    console.log("Backend data to send:", backendData);

    const response = await api.post(
      "/faculty-information/add-faculty",
      backendData,
    );
    // Map backend response to frontend format
    return mapBackendFaculty(response.data);
  } catch (error) {
    console.error("Error adding faculty:", error);
    throw error;
  }
};

export const deleteFaculty = async (facultyId: string) => {
  try {
    await api.delete(`/faculty-information/delete/${facultyId}`);
  } catch (error) {
    console.error("Error deleting faculty:", error);
    throw error;
  }
};
