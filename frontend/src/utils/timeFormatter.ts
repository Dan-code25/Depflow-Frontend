/**
 * Convert 24-hour time format (HH:MM) to 12-hour format with AM/PM
 * @param time - Time in 24-hour format (e.g., "14:30")
 * @returns Time in 12-hour format (e.g., "2:30 PM")
 */
export function formatTo12Hour(time: string): string {
  if (time === "TBD") return "TBD";

  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format time range from 24-hour to 12-hour format with AM/PM
 * @param startTime - Start time in 24-hour format
 * @param endTime - End time in 24-hour format
 * @returns Formatted time range (e.g., "2:30 PM – 4:00 PM")
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  if (startTime === "TBD" || endTime === "TBD") return "TBD";
  return `${formatTo12Hour(startTime)} – ${formatTo12Hour(endTime)}`;
}
