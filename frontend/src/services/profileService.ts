import type { ProfileData } from "../types/profile";
import api from "./api";

export const getPersonalInfo = async () => {
  try {
    const response = await api.get("/profile/personal-info");
    console.log("Personal info response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching personal info:", error);
    throw error;
  }
};

export const updateProfilePicture = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("profilePicture", file);

    const response = await api.post("/profile/profile-picture", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("Profile picture updated:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating profile picture:", error);
    throw error;
  }
};

export const getProfilePicture = async () => {
  try {
    const response = await api.get("/profile/profile-picture");
    console.log("Fetched profile picture:", response.data);

    return response.data.photoUrl;
  } catch (error) {
    console.error("Error fetching profile picture:", error);
    throw error;
  }
};

// Fetch profile picture for a specific faculty member
export const getFacultyProfilePicture = async (facultyId: string) => {
  try {
    const response = await api.get(
      `/faculty-information/profile-picture/${facultyId}`,
    );
    console.log("Fetched faculty profile picture:", response.data);

    return response.data.photoUrl || "";
  } catch (error) {
    console.error("Error fetching faculty profile picture:", error);
    return "";
  }
};

export const getFacultyPersonalInfo = async (facultyId: string) => {
  try {
    const response = await api.get(
      `/profile/faculty/${facultyId}/personal-info`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching faculty personal info:", error);
    // Return empty object on error - will use defaults
    return {};
  }
};

export const updatePersonalInfo = async (data: ProfileData) => {
  try {
    const response = await api.patch("/profile/update/personal-info", data);
    console.log("Personal info updated:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating personal info:", error);
    throw error;
  }
};
