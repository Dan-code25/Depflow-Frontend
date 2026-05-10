import { formatTimeRange } from "../../utils/timeFormatter";

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

interface ScheduleListViewProps {
  data: ScheduleItem[];
}

export function ScheduleListView({ data }: ScheduleListViewProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">
          No courses match the selected filters
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Table Header */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
                Subject Code
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
                Subject Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
                Course and Section
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
                Units
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
                Day
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
                Time
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
                Room
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((s, index) => {
              const time = formatTimeRange(s.startTime, s.endTime);

              return (
                <tr
                  key={`${s.subjectCode}-${s.section}-${s.day}`}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                  }`}
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-[#8B0000]">
                      {s.subjectCode}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{s.subjectName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-700">
                      {s.section}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-700">
                      {s.units}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-700">
                      {s.day}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-700">
                      {time}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{s.room}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
