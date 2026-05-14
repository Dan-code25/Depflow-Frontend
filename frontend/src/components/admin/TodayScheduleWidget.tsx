import { useState, useEffect } from "react";
import { Book, Calendar, Loader2 } from "lucide-react";
import { getTodaySchedule } from "../../services/dashboardService";
import type { DashboardScheduleItem } from "../../services/dashboardService";

interface TodayScheduleProps {
  schedules?: DashboardScheduleItem[];
  isLoading?: boolean;
}

export function TodayScheduleWidget({
  schedules: initialSchedules,
  isLoading: initialIsLoading,
}: TodayScheduleProps) {
  const [schedules, setSchedules] = useState<DashboardScheduleItem[]>(
    initialSchedules || [],
  );
  const [isLoading, setIsLoading] = useState(initialIsLoading || false);

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateFull = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    fetchTodaySchedule();
  }, []);

  const fetchTodaySchedule = async () => {
    setIsLoading(true);

    try {
      const todaySchedules = await getTodaySchedule();
      setSchedules(todaySchedules);
    } catch (err) {
      console.error("Error fetching today's schedule:", err);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm h-full">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar size={20} className="text-burgundy" />
          <h3 className="text-lg font-bold text-charcoal">Today's Schedule</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          {dayName}, {dateFull}
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Here are your schedules for today
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={40} className="text-burgundy animate-spin" />
        </div>
      ) : schedules.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Course & Section
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">
                  Room
                </th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule, index) => (
                <tr
                  key={schedule.id}
                  className={`border-b border-slate-100 hover:bg-red-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-burgundy">
                      {schedule.time}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700 font-medium">
                      {schedule.subject}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{schedule.section}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">{schedule.room}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <Book size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No schedule today</p>
        </div>
      )}
    </div>
  );
}
