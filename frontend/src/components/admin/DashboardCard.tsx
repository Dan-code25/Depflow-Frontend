import React from "react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  onClick?: () => void;
}

export function DashboardCard({
  title,
  value,
  icon,
  description,
  onClick,
}: DashboardCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        onClick ? "hover:border-burgundy" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        {icon && (
          <div className="bg-burgundy rounded-full p-4 flex-shrink-0 flex items-center justify-center text-white">
            {icon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
            {title}
          </h3>

          {/* Value */}
          <p className="text-4xl font-bold text-burgundy mb-2">{value}</p>

          {/* Description */}
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
