import api from "./api";
import type { Education } from "../types/profile";

export const addEducation = async (education: Education) => {
  try {
    const response = await api.post("/education/add", education);
    return response.data;
  } catch (error) {
    console.error("Error adding education:", error);
    throw error;
  }
};

export const getEducations = async () => {
  try {
    const response = await api.get("/education/get-education");
    console.log("Education", response.data);

    return response.data;
  } catch (error) {
    console.error("Error fetching education:", error);
    throw error;
  }
};

export const deleteEducation = async (id: string) => {
  try {
    console.log("Deleting education with ID:", id);
    await api.delete(`/education/delete/${id}`);
  } catch (error) {
    console.error("Error deleting education:", error);
    throw error;
  }
};

