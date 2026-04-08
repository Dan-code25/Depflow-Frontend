import api from "./api";
import type { CoreGroupData } from "../components/admin/CoreGroupBarChart";
import type { GenderData } from "../components/admin/GenderPieChart";
import type { EmploymentTypeData } from "../components/admin/EmploymentTypePieChart";

export const analyticsService = {
  /**
   * Fetch faculty count by core group
   * Backend returns: [ { coreGroup: string, count: number } ]
   */
  async getCoreGroupData(): Promise<CoreGroupData[]> {
    try {
      const response = await api.get("/analytics/core-groups");
      return response.data || [];
    } catch (error) {
      console.error("Error fetching core group data:", error);
      throw error;
    }
  },

  /**
   * Fetch faculty distribution by gender
   * Backend returns: [ { name: "Male" | "Female", value: number } ]
   */
  async getGenderData(): Promise<GenderData[]> {
    try {
      const response = await api.get("/analytics/gender");
      return response.data || [];
    } catch (error) {
      console.error("Error fetching gender data:", error);
      throw error;
    }
  },

  /**
   * Fetch faculty distribution by employment type
   * Backend returns: [ { name: "Full-Time" | "Part-Time" | "Full-Time Part-Time", value: number } ]
   */
  async getEmploymentTypeData(): Promise<EmploymentTypeData[]> {
    try {
      const response = await api.get("/analytics/employment-types");
      return response.data || [];
    } catch (error) {
      console.error("Error fetching employment type data:", error);
      throw error;
    }
  },

  /**
   * Fetch all analytics data at once
   * Useful for initial page load
   */
  async getAllAnalyticsData(): Promise<{
    coreGroups: CoreGroupData[];
    gender: GenderData[];
    employmentTypes: EmploymentTypeData[];
  }> {
    try {
      const [coreGroups, gender, employmentTypes] = await Promise.all([
        this.getCoreGroupData(),
        this.getGenderData(),
        this.getEmploymentTypeData(),
      ]);

      return {
        coreGroups,
        gender,
        employmentTypes,
      };
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      throw error;
    }
  },
};
