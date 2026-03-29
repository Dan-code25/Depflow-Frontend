import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "white" | "burgundy";
}

export function LoadingSpinner({
  size = "sm",
  color = "white",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const colorClasses = {
    white: "border-white",
    burgundy: "border-burgundy",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} loading-spinner`}
      aria-label="Loading"
    />
  );
}
