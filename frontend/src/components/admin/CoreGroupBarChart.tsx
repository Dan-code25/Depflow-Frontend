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

export interface CoreGroupData {
  coreGroup: string;
  count: number;
}

interface CoreGroupBarChartProps {
  data: CoreGroupData[];
  isLoading?: boolean;
  height?: number;
}

export function CoreGroupBarChart({
  data,
  isLoading = false,
  height = 400,
}: CoreGroupBarChartProps) {
  // Calculate Y-axis ticks by intervals of 2
  const maxCount = Math.max(...(data?.map((d) => d.count) || [0]));
  const yAxisTicks = Array.from(
    { length: Math.floor(maxCount / 2) + 2 },
    (_, i) => i * 2
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
        Faculty Count by Core Group
      </h2>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="coreGroup"
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
            cursor={{ fill: "rgba(186, 85, 211, 0.1)" }}
          />
          <Legend />
          <Bar
            dataKey="count"
            fill="#6b3f8a"
            radius={[8, 8, 0, 0]}
            name="Number of Faculty"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
