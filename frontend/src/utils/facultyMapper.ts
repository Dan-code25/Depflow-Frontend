import type { Faculty } from "../types/faculty";

// Backend API response format (supports both camelCase and snake_case)
export interface BackendFaculty {
  // IDs
  faculty_id?: string;
  facultyId?: string;
  employee_id?: string;
  employeeId?: string;
  // Personal info
  email: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  middle_name?: string | null;
  middleName?: string | null;
  gender?: string | null;
  age?: number;
  birthdate?: string;
  birthDate?: string;
  city?: string;
  province?: string;
  title?: string;
  // Contact
  contact_number?: string;
  contactNumber?: string;
  // Profile
  profile_picture?: string | null;
  profilePicture?: string | null;
  photo_url?: string | null;
  photoUrl?: string | null;
  // Employment
  core_group?: string;
  coreGroup?: string;
  employment_type?: string;
  employmentType?: string;
  date_hired?: string;
  dateHired?: string;
  designation: string;
  role?: string;
  [key: string]: any; // Allow other fields from backend
}

/**
 * Transform backend faculty data to frontend format
 * Supports both camelCase and snake_case field names
 */
export function mapBackendFaculty(data: BackendFaculty): Faculty {
  const faculty: Faculty = {
    id:
      data.faculty_id ||
      data.facultyId ||
      data.employee_id ||
      data.employeeId ||
      String(Date.now()),
    email: data.email || "",
    firstName: data.first_name || data.firstName || "",
    lastName: data.last_name || data.lastName || "",
    middleName: data.middle_name || data.middleName || undefined,
    profilePicture:
      data.photo_url ||
      data.photoUrl ||
      data.profile_picture ||
      data.profilePicture ||
      undefined,
    contactNumber: data.contact_number || data.contactNumber || "",
    coreGroup: (data.core_group || data.coreGroup || "IT CORE") as any,
    employmentType: (data.employment_type ||
      data.employmentType ||
      "Full-Time") as any,
    employeeId: data.employee_id || data.employeeId || "",
    dateHired: data.date_hired || data.dateHired || "",
    designation: data.designation || "",
    // Personal info fields
    city: data.city || undefined,
    province: data.province || undefined,
    age: data.age || undefined,
    birthDate: data.birthdate || data.birthDate || undefined,
    title: data.title || undefined,
    gender: data.gender || undefined,
  };

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
    gender: data.gender,
    core_group: data.coreGroup,
    employment_type: data.employmentType,
    employee_id: data.employeeId,
    date_hired: data.dateHired,
    designation: data.designation,
  };
}
