import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LoadingSpinner } from "../common/LoadingSpinner";

export interface EmploymentTypeData {
  name: string;
  value: number;
}

interface EmploymentTypePieChartProps {
  data: EmploymentTypeData[];
  isLoading?: boolean;
  height?: number;
}

// Colors for employment types
const EMPLOYMENT_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export function EmploymentTypePieChart({
  data,
  isLoading = false,
  height = 400,
}: EmploymentTypePieChartProps) {
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
        Faculty Distribution by Employment Type
      </h2>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={EMPLOYMENT_COLORS[index % EMPLOYMENT_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
