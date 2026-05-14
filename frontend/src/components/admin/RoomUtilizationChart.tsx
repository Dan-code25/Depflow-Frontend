import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { LoadingSpinner } from "../common/LoadingSpinner";

export interface RoomUtilizationData {
  room_id: string;
  room_name: string;
  used_hours: number;
}

interface RoomUtilizationChartProps {
  data: RoomUtilizationData[];
  isLoading?: boolean;
  height?: number;
}

export function RoomUtilizationChart({
  data,
  isLoading = false,
  height = 400,
}: RoomUtilizationChartProps) {
  // Transform data for chart display
  const chartData =
    data && data.length > 0
      ? data.map((item) => ({
          room_name: item.room_name,
          used_hours: item.used_hours,
        }))
      : [];

  // Calculate Y-axis ticks by intervals of 5
  const maxHours =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.used_hours)) : 0;
  const yAxisTicks = Array.from(
    { length: Math.floor(maxHours / 5) + 2 },
    (_, i) => i * 5,
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg shadow-sm"
        style={{ height: `${height}px` }}
      >
        <LoadingSpinner size="md" color="burgundy" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-500"
        style={{ height: `${height}px` }}
      >
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-charcoal mb-4">
        Room Utilization by Hours
      </h2>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="room_name"
            tick={{ fontSize: 12 }}
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} ticks={yAxisTicks} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
            cursor={{ fill: "rgba(162, 28, 60, 0.1)" }}
            formatter={(value) => `${value} hours`}
          />
          <Legend />
          <Bar
            dataKey="used_hours"
            fill="#a21c3c"
            radius={[8, 8, 0, 0]}
            name="Used Hours"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
