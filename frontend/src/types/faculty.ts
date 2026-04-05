export interface Faculty {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  profilePicture?: string;
  contactNumber: string;
  coreGroup: "IT CORE" | "CS CORE" | "IS CORE" | "General Education";
  employmentType: "Full-time" | "Part-time" | "Full-time Part-time";
  employeeId: string;
  dateHired: string;
  designation: string;
  // Additional personal info fields
  city?: string;
  province?: string;
  age?: number;
  birthDate?: string;
  title?: string;
  gender?: string | null;
}

export interface AddFacultyFormData {
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  contactNumber: string;
  coreGroup: "IT CORE" | "CS CORE" | "IS CORE" | "General Education";
  employmentType: "Full-Time" | "Part-Time" | "Full-Time Part-Time";
  employeeId: string;
  dateHired: string;
  designation: string;
}

export type CoreGroupFilter =
  | "All"
  | "IT CORE"
  | "CS CORE"
  | "IS CORE"
  | "General Education";
export type EmploymentTypeFilter =
  | "All"
  | "Full-time"
  | "Part-time"
  | "Full-time Part-time";
