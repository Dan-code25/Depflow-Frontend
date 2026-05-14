import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { PageHeader } from "../../components/admin/PageHeader";
import {
  CoreGroupBarChart,
  type CoreGroupData,
} from "../../components/admin/CoreGroupBarChart";
import {
  GenderPieChart,
  type GenderData,
} from "../../components/admin/GenderPieChart";
import {
  EmploymentTypePieChart,
  type EmploymentTypeData,
} from "../../components/admin/EmploymentTypePieChart";
import {
  RoomUtilizationChart,
  type RoomUtilizationData,
} from "../../components/admin/RoomUtilizationChart";
import { analyticsService } from "../../services/analyticsService";
import { BarChart3 } from "lucide-react";

export default function AdminAnalyticsPage() {
  // Core Group Bar Chart State
  const [coreGroupData, setCoreGroupData] = useState<CoreGroupData[]>([]);
  const [coreGroupLoading, setCoreGroupLoading] = useState(true);
  const [coreGroupError, setCoreGroupError] = useState<string | null>(null);

  // Gender Pie Chart State
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [genderLoading, setGenderLoading] = useState(true);
  const [genderError, setGenderError] = useState<string | null>(null);

  // Employment Type Pie Chart State
  const [employmentTypeData, setEmploymentTypeData] = useState<
    EmploymentTypeData[]
  >([]);
  const [employmentTypeLoading, setEmploymentTypeLoading] = useState(true);
  const [employmentTypeError, setEmploymentTypeError] = useState<string | null>(
    null,
  );

  // Room Utilization Chart State
  const [roomUtilizationData, setRoomUtilizationData] = useState<
    RoomUtilizationData[]
  >([]);
  const [roomUtilizationLoading, setRoomUtilizationLoading] = useState(true);
  const [roomUtilizationError, setRoomUtilizationError] = useState<
    string | null
  >(null);

  // Fetch analytics data on component mount
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const data = await analyticsService.getAllAnalyticsData();

        // Set all data (will be empty arrays if fetch failed)
        setCoreGroupData(data.coreGroups || []);
        setGenderData(data.gender || []);
        setEmploymentTypeData(data.employmentTypes || []);
        setRoomUtilizationData(data.roomUtilization || []);

        // Clear all errors initially
        setCoreGroupError(null);
        setGenderError(null);
        setEmploymentTypeError(null);
        setRoomUtilizationError(null);

        // Set error if specific data is empty (but don't fail entirely)
        if (!data.coreGroups || data.coreGroups.length === 0) {
          setCoreGroupError("No data available");
        }
        if (!data.gender || data.gender.length === 0) {
          setGenderError("No data available");
        }
        if (!data.employmentTypes || data.employmentTypes.length === 0) {
          setEmploymentTypeError("No data available");
        }
        if (!data.roomUtilization || data.roomUtilization.length === 0) {
          setRoomUtilizationError("No data available");
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch data";
        setCoreGroupError(errorMessage);
        setGenderError(errorMessage);
        setEmploymentTypeError(errorMessage);
        setRoomUtilizationError(errorMessage);
      } finally {
        setCoreGroupLoading(false);
        setGenderLoading(false);
        setEmploymentTypeLoading(false);
        setRoomUtilizationLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // Handle retry for core group
  const handleReloadCoreGroup = async () => {
    try {
      setCoreGroupLoading(true);
      setCoreGroupError(null);
      const data = await analyticsService.getCoreGroupData();
      setCoreGroupData(data);
    } catch (error) {
      setCoreGroupError(
        error instanceof Error ? error.message : "Failed to fetch data",
      );
    } finally {
      setCoreGroupLoading(false);
    }
  };

  // Handle retry for gender
  const handleReloadGender = async () => {
    try {
      setGenderLoading(true);
      setGenderError(null);
      const data = await analyticsService.getGenderData();
      setGenderData(data);
    } catch (error) {
      setGenderError(
        error instanceof Error ? error.message : "Failed to fetch data",
      );
    } finally {
      setGenderLoading(false);
    }
  };

  // Handle retry for employment type
  const handleReloadEmploymentType = async () => {
    try {
      setEmploymentTypeLoading(true);
      setEmploymentTypeError(null);
      const data = await analyticsService.getEmploymentTypeData();
      setEmploymentTypeData(data);
    } catch (error) {
      setEmploymentTypeError(
        error instanceof Error ? error.message : "Failed to fetch data",
      );
    } finally {
      setEmploymentTypeLoading(false);
    }
  };

  // Handle retry for room utilization
  const handleReloadRoomUtilization = async () => {
    try {
      setRoomUtilizationLoading(true);
      setRoomUtilizationError(null);
      const data = await analyticsService.getRoomUtilizationData();
      setRoomUtilizationData(data);
    } catch (error) {
      setRoomUtilizationError(
        error instanceof Error ? error.message : "Failed to fetch data",
      );
    } finally {
      setRoomUtilizationLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header Section */}
        <div className="container-main pt-0 pb-8">
          <PageHeader
            title="Analytics"
            description="View faculty statistics and analytics across different dimensions"
            Icon={<BarChart3 size={28} className="text-burgundy" />}
          />
        </div>

        {/* Charts Section */}
        <div className="container-main py-8 space-y-8">
          {/* Core Group Bar Chart and Room Utilization Chart Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Core Group Bar Chart */}
            <div>
              {coreGroupError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">
                      Error Loading Core Group Data
                    </h3>
                    <p className="text-red-700 text-sm">{coreGroupError}</p>
                  </div>
                  <button
                    onClick={handleReloadCoreGroup}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <CoreGroupBarChart
                  data={coreGroupData}
                  isLoading={coreGroupLoading}
                  height={400}
                />
              )}
            </div>

            {/* Room Utilization Chart */}
            <div>
              {roomUtilizationError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">
                      Error Loading Room Utilization Data
                    </h3>
                    <p className="text-red-700 text-sm">
                      {roomUtilizationError}
                    </p>
                  </div>
                  <button
                    onClick={handleReloadRoomUtilization}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition whitespace-nowrap cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <RoomUtilizationChart
                  data={roomUtilizationData}
                  isLoading={roomUtilizationLoading}
                  height={400}
                />
              )}
            </div>
          </div>

          {/* Gender and Employment Type Charts in Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gender Pie Chart */}
            <div>
              {genderError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">
                      Error Loading Gender Data
                    </h3>
                    <p className="text-red-700 text-sm">{genderError}</p>
                  </div>
                  <button
                    onClick={handleReloadGender}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition whitespace-nowrap cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <GenderPieChart
                  data={genderData}
                  isLoading={genderLoading}
                  height={400}
                />
              )}
            </div>

            {/* Employment Type Pie Chart */}
            <div>
              {employmentTypeError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">
                      Error Loading Employment Type Data
                    </h3>
                    <p className="text-red-700 text-sm">
                      {employmentTypeError}
                    </p>
                  </div>
                  <button
                    onClick={handleReloadEmploymentType}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition whitespace-nowrap cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <EmploymentTypePieChart
                  data={employmentTypeData}
                  isLoading={employmentTypeLoading}
                  height={400}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
