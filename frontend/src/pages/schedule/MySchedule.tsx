import { AdminLayout } from "../../components/layout/AdminLayout";
import { FacultyLayout } from "../../components/layout/FacultyLayout";
import { PageHeader } from "../../components/admin/PageHeader";
import { ScheduleTimetable } from "../../components/schedule/ScheduleTimetable";
import { ScheduleListView } from "../../components/schedule/ScheduleCardView";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import {
  CalendarClock,
  List,
  TableProperties,
  Filter,
  Calendar,
  BookOpen,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  getUniqueCourses,
  filterScheduleData,
} from "../../utils/scheduleFilters";
import { getMySchedule } from "../../services/scheduleService";

interface ScheduleItem {
  subjectCode: string;
  subjectName: string;
  section: string;
  units: number;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

export default function MySchedule() {
  const userRole = localStorage.getItem("user_role");
  const Layout = userRole === "admin" ? AdminLayout : FacultyLayout;
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "timetable">("list");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMySchedule();
        setScheduleData(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load schedule";
        setError(errorMessage);
        console.error("Error loading schedule:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, []);

  // All days of the week
  const ALL_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Get unique courses from data
  const uniqueCourses = useMemo(
    () => getUniqueCourses(scheduleData),
    [scheduleData],
  );

  // Filter data based on selected course and day
  const filteredData = useMemo(
    () => filterScheduleData(scheduleData, selectedCourse, selectedDay),
    [scheduleData, selectedCourse, selectedDay],
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <PageHeader
          title="My Schedule"
          description="View your teaching schedule and upcoming classes for the current semester"
          Icon={<CalendarClock size={28} className="text-burgundy" />}
        />

        <div className="px-6 py-8">
          {loading && (
            <div className="bg-white border border-slate-200 rounded-lg p-12 shadow-sm">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-burgundy/10 rounded-full blur-lg" />
                  <LoadingSpinner size="lg" color="burgundy" />
                </div>
                <h3 className="text-lg font-semibold text-charcoal">
                  Loading your schedule...
                </h3>
                <p className="text-sm text-slate-500">
                  Please wait while we fetch your schedule
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {!loading && scheduleData.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
              <p className="text-gray-500 text-base">
                No schedule data available
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Your schedule will appear here once it's assigned
              </p>
            </div>
          )}

          {!loading && scheduleData.length > 0 && (
            <>
              {/* Filters Card */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Filter Label */}
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Filter size={20} className="text-burgundy" />
                    <h3 className="text-sm font-bold text-charcoal uppercase tracking-wide">
                      Filter
                    </h3>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col lg:flex-row lg:items-end gap-6 flex-1">
                    {/* Course Filter */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                        <BookOpen size={16} className="text-burgundy" />
                        Course and Section
                      </label>
                      <select
                        value={selectedCourse || ""}
                        onChange={(e) =>
                          setSelectedCourse(
                            e.target.value === "" ? null : e.target.value,
                          )
                        }
                        className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition-all"
                      >
                        <option value="">All Courses</option>
                        {uniqueCourses.map((course) => (
                          <option key={course} value={course}>
                            {course}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Day Filter */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                        <Calendar size={16} className="text-burgundy" />
                        Day
                      </label>
                      <select
                        value={selectedDay || ""}
                        onChange={(e) =>
                          setSelectedDay(
                            e.target.value === "" ? null : e.target.value,
                          )
                        }
                        className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition-all"
                      >
                        <option value="">All Days</option>
                        {ALL_DAYS.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clear Filters Button */}
                    {(selectedCourse || selectedDay) && (
                      <button
                        onClick={() => {
                          setSelectedCourse(null);
                          setSelectedDay(null);
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-sm font-medium transition-all duration-200 h-fit"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setView("list")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                    view === "list"
                      ? "bg-burgundy border-burgundy text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <List size={13} />
                  List
                </button>
                <button
                  onClick={() => setView("timetable")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                    view === "timetable"
                      ? "bg-burgundy border-burgundy text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <TableProperties size={13} />
                  Timetable
                </button>
              </div>

              {/* No Schedule Message */}
              {filteredData.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-700 text-sm font-medium">
                    No schedule assigned for{" "}
                    {selectedDay ? `${selectedDay}` : "the selected filters"}
                  </p>
                </div>
              )}

              {/* List View */}
              {view === "list" && filteredData.length > 0 && (
                <ScheduleListView data={filteredData} />
              )}

              {/* Timetable View */}
              {view === "timetable" && filteredData.length > 0 && (
                <div className="bg-white rounded-lg">
                  <ScheduleTimetable data={filteredData} readOnly={true} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
