import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { PageHeader } from "../../components/admin/PageHeader";
import { DashboardCard } from "../../components/admin/DashboardCard";
import { TodayScheduleWidget } from "../../components/admin/TodayScheduleWidget";
import { LoadUnitsWidget } from "../../components/admin/LoadUnitsWidget";
import { AnnouncementsWidget } from "../../components/admin/AnnouncementsWidget";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Notebook,
  NotebookPen,
} from "lucide-react";
import {
  getTotalSubjectsCount,
  getMySubjectsCount,
  getDraftSchedulesCount,
  getLoadUnits,
} from "../../services/dashboardService";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [totalSubjects, setTotalSubjects] = useState<number>(0);
  const [mySubjects, setMySubjects] = useState<number>(0);
  const [draftSchedules, setDraftSchedules] = useState<number>(0);
  const [currentUnits, setCurrentUnits] = useState<number>(0);
  const [maxUnits, setMaxUnits] = useState<number>(24);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardCounts();
  }, []);

  const fetchDashboardCounts = async () => {
    setIsLoading(true);
    try {
      const [total, mine, draft, loadUnits] = await Promise.all([
        getTotalSubjectsCount(),
        getMySubjectsCount(),
        getDraftSchedulesCount(),
        getLoadUnits(),
      ]);
      setTotalSubjects(total);
      setMySubjects(mine);
      setDraftSchedules(draft);
      setCurrentUnits(loadUnits.currentUnits);
      setMaxUnits(loadUnits.maxUnits);
    } catch (error) {
      console.error("Error fetching dashboard counts:", error);
      setTotalSubjects(0);
      setMySubjects(0);
      setDraftSchedules(0);
      setCurrentUnits(0);
      setMaxUnits(24);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Dashboard"
        description="Here are the overview of the your faculty, schedules, and announcements."
        Icon={<LayoutDashboard size={28} className="text-burgundy" />}
      />

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8">
        <DashboardCard
          title="Total Faculty"
          value="22"
          icon={<Users size={24} />}
          description="Active faculty members"
          onClick={() => navigate("/admin/manage-faculty")}
        />
        <DashboardCard
          title="Draft Schedules"
          value={isLoading ? "..." : draftSchedules.toString()}
          icon={<Calendar size={24} />}
          description="Pending schedules to review"
          onClick={() => navigate("/admin/manage-schedule")}
        />
        <DashboardCard
          title="Total Subjects"
          value={isLoading ? "..." : totalSubjects.toString()}
          icon={<Notebook size={24} />}
          description="Subjects offered this semester"
          onClick={() => navigate("/admin/manage-schedule")}
        />
        <DashboardCard
          title="My Subjects"
          value={isLoading ? "..." : mySubjects.toString()}
          icon={<NotebookPen size={24} />}
          description="Number of assigned subjects"
          onClick={() => navigate("/admin/my-schedule")}
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
    </AdminLayout>
  );
}
