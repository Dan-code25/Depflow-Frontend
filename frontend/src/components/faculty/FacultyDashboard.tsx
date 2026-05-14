import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FacultyLayout } from "../layout/FacultyLayout";
import { PageHeader } from "../admin/PageHeader";
import { DashboardCard } from "../admin/DashboardCard";
import { TodayScheduleWidget } from "../admin/TodayScheduleWidget";
import { LoadUnitsWidget } from "../admin/LoadUnitsWidget";
import { AnnouncementsWidget } from "../admin/AnnouncementsWidget";
import { Users, NotebookPen, LayoutDashboard } from "lucide-react";
import {
  getMySubjectsCount,
  getLoadUnits,
} from "../../services/dashboardService";

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [totalFaculty, setTotalFaculty] = useState<number>(0);
  const [mySubjects, setMySubjects] = useState<number>(0);
  const [currentUnits, setCurrentUnits] = useState<number>(0);
  const [maxUnits, setMaxUnits] = useState<number>(24);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFacultyDashboardData();
  }, []);

  const fetchFacultyDashboardData = async () => {
    setIsLoading(true);
    try {
      const [subjectsCount, loadUnits] = await Promise.all([
        getMySubjectsCount(),
        getLoadUnits(),
      ]);
      // Total faculty would typically be fetched, for now using a placeholder
      setTotalFaculty(22);
      setMySubjects(subjectsCount);
      setCurrentUnits(loadUnits.currentUnits);
      setMaxUnits(loadUnits.maxUnits);
    } catch (error) {
      console.error("Error fetching faculty dashboard data:", error);
      setTotalFaculty(0);
      setMySubjects(0);
      setCurrentUnits(0);
      setMaxUnits(24);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FacultyLayout>
      <PageHeader
        title="Dashboard"
        description="Here is an overview of your faculty information, schedule, and announcements."
        Icon={<LayoutDashboard size={28} className="text-burgundy" />}
      />

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
        <DashboardCard
          title="Total Faculty"
          value={totalFaculty.toString()}
          icon={<Users size={24} />}
          description="Active faculty members"
          onClick={() => navigate("/faculty/information")}
        />
        <DashboardCard
          title="My Subjects"
          value={isLoading ? "..." : mySubjects.toString()}
          icon={<NotebookPen size={24} />}
          description="Number of assigned subjects"
          onClick={() => navigate("/faculty/my-schedule")}
        />
        <div className="md:col-span-1">
          <LoadUnitsWidget
            currentUnits={currentUnits}
            maxUnits={maxUnits}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Today's Schedule and Announcements Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
        <div className="lg:col-span-2 min-h-96">
          <TodayScheduleWidget />
        </div>

        <div className="lg:col-span-2 min-h-96">
          <AnnouncementsWidget />
        </div>
      </div>

      <div className="mt-12">{/* Additional content can be added here */}</div>
    </FacultyLayout>
  );
}
