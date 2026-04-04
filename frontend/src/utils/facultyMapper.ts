import type { Faculty } from "../types/faculty";

// Backend API response format
export interface BackendFaculty {
  faculty_id: string;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  profilePicture?: string | null;
  contact_number: string;
  core_group: string;
  employment_type: string;
  date_hired: string;
  designation: string;
  photo_url?: string | null;
  [key: string]: any; // Allow other fields from backend
}

/**
 * Transform backend faculty data to frontend format
 */
export function mapBackendFaculty(data: BackendFaculty): Faculty {
  const faculty: Faculty = {
    id: data.faculty_id || data.employee_id || String(Date.now()),
    email: data.email || "",
    firstName: data.first_name || "",
    lastName: data.last_name || "",
    middleName: data.middle_name || undefined,
    profilePicture: data.photo_url || undefined,
    contactNumber: data.contact_number || "",
    coreGroup: (data.core_group || "IT CORE") as any,
    employmentType: (data.employment_type || "Full-Time") as any,
    employeeId: data.employee_id || "",
    dateHired: data.date_hired || "",
    designation: data.designation || "",
  };

  // Debug logging
  console.log("Mapped faculty:", faculty);

  return faculty;
}

/**
 * Transform frontend form data to backend format
 */
export function mapToBackendFaculty(data: any) {
  return {
    email: data.email,
    first_name: data.firstName,
    last_name: data.lastName,
    middle_name: data.middleName || null,
    contact_number: data.contactNumber,
    core_group: data.coreGroup,
    employment_type: data.employmentType,
    employee_id: data.employeeId,
    date_hired: data.dateHired,
    designation: data.designation,
  };
}
