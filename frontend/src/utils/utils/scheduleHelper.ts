export const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 20; h++) {
  const hour = h > 12 ? h - 12 : h;
  const period = h < 12 ? "AM" : "PM";
  TIME_SLOTS.push(`${hour}:00 ${period}`);
  if (h < 20) TIME_SLOTS.push(`${hour}:30 ${period}`);
}

export function timeToIndex(time: string): number {
  return TIME_SLOTS.indexOf(time);
}

export function getSlotSpan(start: string, end: string): number {
  return timeToIndex(end) - timeToIndex(start);
}

export function isHourSlot(time: string): boolean {
  return time.includes(":00");
}

export const SCHEDULE_COLORS: Record<string, string> = {
  blue: "bg-blue-100 border-blue-300 text-blue-800",
  purple: "bg-purple-100 border-purple-300 text-purple-800",
  green: "bg-green-100 border-green-300 text-green-800",
  amber: "bg-amber-100 border-amber-300 text-amber-800",
  rose: "bg-rose-100 border-rose-300 text-rose-800",
};

export const BORDER_COLORS: Record<string, string> = {
  blue: "border-l-blue-400",
  purple: "border-l-purple-400",
  green: "border-l-green-400",
  amber: "border-l-amber-400",
  rose: "border-l-rose-400",
};
