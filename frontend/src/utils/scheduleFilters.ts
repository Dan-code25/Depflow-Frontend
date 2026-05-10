/**
 * Schedule item interface matching backend format
 */
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

/**
 * Get unique courses (sections) from schedule data
 */
export function getUniqueCourses(data: ScheduleItem[]): string[] {
  const courses = new Set(data.map((s) => s.section));
  return Array.from(courses).sort();
}

/**
 * Get unique days from schedule data
 */
export function getUniqueDaysFromSchedule(data: ScheduleItem[]): string[] {
  const daysOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const days = new Set(data.map((s) => s.day));
  return daysOrder.filter((d) => days.has(d));
}

/**
 * Filter schedule data by course and day
 */
export function filterScheduleData(
  data: ScheduleItem[],
  selectedCourse: string | null,
  selectedDay: string | null,
): ScheduleItem[] {
  return data.filter((s) => {
    const courseMatch = selectedCourse === null || s.section === selectedCourse;
    const dayMatch = selectedDay === null || s.day === selectedDay;
    return courseMatch && dayMatch;
  });
}

/**
 * DEPRECATED: Old functions kept for backward compatibility
 */
import type { ScheduleAssignment } from "./geminiSchedHelper";

export function getUniqueSections(data: ScheduleAssignment[]): string[] {
  const sections = new Set(data.map((s) => s.section));
  return Array.from(sections).sort();
}

export function getUniqueDays(
  data: ScheduleAssignment[],
  daysList: string[],
): string[] {
  const days = new Set(data.map((s) => s.day));
  return daysList.filter((d) => days.has(d));
}

export function getUniqueFacultyIds(data: ScheduleAssignment[]): string[] {
  const facultyIds = new Set(data.map((s) => s.faculty_id).filter(Boolean));
  return Array.from(facultyIds).sort();
}

export function filterScheduleBySelections(
  data: ScheduleAssignment[],
  selectedSection: string | null,
  selectedDay: string | null,
  selectedFaculty: string | null,
): ScheduleAssignment[] {
  return data.filter((s) => {
    const sectionMatch =
      selectedSection === null || s.section === selectedSection;
    const dayMatch = selectedDay === null || s.day === selectedDay;
    const facultyMatch =
      selectedFaculty === null || s.faculty_id === selectedFaculty;
    return sectionMatch && dayMatch && facultyMatch;
  });
}
