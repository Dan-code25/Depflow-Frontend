import api from "./api";
import type { Research } from "../types/profile";

// Fetch all research records
export const getResearch = async () => {
  try {
    const response = await api.get("/research/get-research");
    const data = response.data;

    const researches: Research[] = (data || []).map((item: any) => ({
      researchId: item.res_id?.toString(),
      title: item.title,
      journalConference: item.journal_conference,
      type: item.research_type,
      year: item.published_year,
    }));

    return researches;
  } catch (error) {
    console.error("Error fetching research:", error);
    throw error;
  }
};

// Add research
export const addResearch = async (research: Research) => {
  try {
    const response = await api.post("/research/add-research", research);
    return response.data;
  } catch (error) {
    console.error("Error adding research:", error);
    throw error;
  }
};

// Delete research
export const deleteResearch = async (id: string) => {
  try {
    const response = await api.delete(`research/delete/research/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting research:", error);
    throw error;
  }
};
