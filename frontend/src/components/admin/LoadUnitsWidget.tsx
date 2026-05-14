import { Zap, Loader2 } from "lucide-react";

interface LoadUnitsProps {
  currentUnits?: number;
  maxUnits?: number;
  isLoading?: boolean;
}

export function LoadUnitsWidget({
  currentUnits = 18,
  maxUnits = 24,
  isLoading = false,
}: LoadUnitsProps) {
  const percentage = (currentUnits / maxUnits) * 100;
  const isOverloaded = currentUnits > maxUnits;

  // Determine color based on load percentage
  const getLoadColor = () => {
    if (isOverloaded || percentage > 90) {
      return { bar: "bg-red-600", text: "text-red-600" };
    } else if (percentage > 70) {
      return { bar: "bg-amber-500", text: "text-amber-600" };
    } else {
      return { bar: "bg-green-600", text: "text-green-600" };
    }
  };

  const loadColor = getLoadColor();

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Zap
            size={20}
            className={`${isLoading ? "text-burgundy" : loadColor.text}`}
          />
          <h3 className="text-lg font-bold text-charcoal">My Load Units</h3>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 size={40} className="text-burgundy animate-spin" />
        </div>
      ) : (
        <>
          {/* Units Display */}
          <div className="flex items-baseline gap-3 mb-3">
            <span className={`text-4xl font-bold ${loadColor.text}`}>
              {currentUnits}
            </span>
            <span className="text-sm text-slate-600">/ {maxUnits} units</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${loadColor.bar}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
