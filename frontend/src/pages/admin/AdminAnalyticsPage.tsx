import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { AnalyticsHeader } from "../../components/admin/AnalyticsHeader";
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
import { analyticsService } from "../../services/analyticsService";

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

  // Fetch analytics data on component mount
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const data = await analyticsService.getAllAnalyticsData();

        // Set all data
        setCoreGroupData(data.coreGroups);
        setGenderData(data.gender);
        setEmploymentTypeData(data.employmentTypes);

        // Clear errors
        setCoreGroupError(null);
        setGenderError(null);
        setEmploymentTypeError(null);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch data";
        setCoreGroupError(errorMessage);
        setGenderError(errorMessage);
        setEmploymentTypeError(errorMessage);
      } finally {
        setCoreGroupLoading(false);
        setGenderLoading(false);
        setEmploymentTypeLoading(false);
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

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header Section */}
        <div className="container-main pt-0 pb-8">
          <AnalyticsHeader
            title="Analytics"
            description="View faculty statistics and analytics across different dimensions"
          />
        </div>

        {/* Charts Section */}
        <div className="container-main py-8 space-y-8">
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
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
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
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition whitespace-nowrap"
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
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition whitespace-nowrap"
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
