export interface ProfileData {
  firstName: string;
  lastName: string;
  middleName: string;
  age?: number;
  birthDate: string;
  email: string;
  contactNumber: string;
  employeeId: string;
  designation: string;
  employmentType: string;
  dateHired: string;
  city: string;
  province: string;
  title: string;
  profilePicture?: string; // Base64 or image URL
}

export interface Education {
  edId?: string;
  degreeLevel: string;
  degreeType: string;
  major: string;
  university: string;
  yearGraduated: number;
}

export type CredentialType =
  | "certification"
  | "license"
  | "seminar"
  | "experience";

export interface Credential {
  id?: string;
  type: CredentialType;
  // Common fields
  title: string;
  yearObtained?: number;
  // Certification fields
  organization?: string;
  // License fields
  issuingAuthority?: string;
  // Seminar fields
  organizer?: string;
  // Work experience fields
  company?: string;
  startYear?: number;
  endYear?: number;
}
