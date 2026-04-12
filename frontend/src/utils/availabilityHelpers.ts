import type { DayTimeRange } from "../types/profile";

/**
 * Format days array to readable string
 * @example formatDaysDisplay(["Monday", "Wednesday", "Friday"]) -> "Mon, Wed, Fri"
 */
export const formatDaysDisplay = (days: string[]): string => {
  return days.map((day) => day.substring(0, 3)).join(", ");
};

/**
 * Format time range to readable string
 * @example formatTimeRange("09:00", "12:00") -> "09:00 - 12:00"
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`;
};

/**
 * Format day time ranges to readable string
 * @example { Monday: {startTime: "09:00", endTime: "11:00"}, ... } -> "Mon: 09:00-11:00, Wed: 09:00-11:00, ..."
 */
export const formatDayTimeRanges = (
  dayTimeRanges: Record<string, DayTimeRange>,
): string => {
  return Object.entries(dayTimeRanges)
    .map(
      ([day, times]) =>
        `${day.substring(0, 3)}: ${times.startTime}-${times.endTime}`,
    )
    .join(", ");
};

/**
 * Validate that end time is after start time
 */
export const validateTimeRange = (
  startTime: string,
  endTime: string,
): boolean => {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startTotalMins = startHour * 60 + startMin;
  const endTotalMins = endHour * 60 + endMin;

  return endTotalMins > startTotalMins;
};

/**
 * Validate availability form data
 */
export const validateAvailabilityForm = (
  subjectIds: string[],
  dayTimeRanges: Record<string, DayTimeRange>,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (subjectIds.length === 0) {
    errors.push("At least one subject must be selected");
  }

  if (Object.keys(dayTimeRanges).length === 0) {
    errors.push("At least one day must be selected");
  }

  // Validate each day's time range
  Object.entries(dayTimeRanges).forEach(([day, times]) => {
    if (!times.startTime) {
      errors.push(`${day}: Start time is required`);
    }
    if (!times.endTime) {
      errors.push(`${day}: End time is required`);
    }
    if (
      times.startTime &&
      times.endTime &&
      !validateTimeRange(times.startTime, times.endTime)
    ) {
      errors.push(`${day}: End time must be after start time`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
