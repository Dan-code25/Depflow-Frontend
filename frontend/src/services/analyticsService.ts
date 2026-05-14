import api from "./api";
import type { CoreGroupData } from "../components/admin/CoreGroupBarChart";
import type { GenderData } from "../components/admin/GenderPieChart";
import type { EmploymentTypeData } from "../components/admin/EmploymentTypePieChart";
import type { RoomUtilizationData } from "../components/admin/RoomUtilizationChart";

export const analyticsService = {
  async getCoreGroupData(): Promise<CoreGroupData[]> {
    try {
      const response = await api.get("/analytics/core-groups");
      return response.data || [];
    } catch (error) {
      console.error("Error fetching core group data:", error);
      throw error;
    }
  },

  async getGenderData(): Promise<GenderData[]> {
    try {
      const response = await api.get("/analytics/gender");
      return response.data || [];
    } catch (error) {
      console.error("Error fetching gender data:", error);
      throw error;
    }
  },


  async getEmploymentTypeData(): Promise<EmploymentTypeData[]> {
    try {
      const response = await api.get("/analytics/employment-types");
      return response.data || [];
    } catch (error) {
      console.error("Error fetching employment type data:", error);
      throw error;
    }
  },


  async getRoomUtilizationData(): Promise<RoomUtilizationData[]> {
    try {
      const response = await api.get("/analytics/room-utilization");
      return response.data || [];
    } catch (error) {
      console.error("Error fetching room utilization data:", error);
      throw error;
    }
  },


  async getAllAnalyticsData(): Promise<{
    coreGroups: CoreGroupData[];
    gender: GenderData[];
    employmentTypes: EmploymentTypeData[];
    roomUtilization: RoomUtilizationData[];
  }> {
    try {

      const results = await Promise.allSettled([
        this.getCoreGroupData(),
        this.getGenderData(),
        this.getEmploymentTypeData(),
        this.getRoomUtilizationData(),
      ]);

      const coreGroups =
        results[0].status === "fulfilled" ? results[0].value : [];
      const gender = results[1].status === "fulfilled" ? results[1].value : [];
      const employmentTypes =
        results[2].status === "fulfilled" ? results[2].value : [];
      const roomUtilization =
        results[3].status === "fulfilled" ? results[3].value : [];

      return {
        coreGroups,
        gender,
        employmentTypes,
        roomUtilization,
      };
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      throw error;
    }
  },
};
