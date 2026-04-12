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

export interface Research {
  researchId?: string;
  title: string;
  journalConference: string;
  type: "Journal" | "Conference" | "Thesis/Dissertation" | "Book/Chapter" | "Patent" | "Technical Report" | "Policy Brief" | "Research Project";
  year: number;
}

export interface DayTimeRange {
  startTime: string; // "09:00"
  endTime: string;   // "12:00"
}

export interface Availability {
  id: string;
  subjectIds: string[];           // Multiple subjects they can teach
  subjectNames: string[];         // Subject names for display
  dayTimeRanges: Record<string, DayTimeRange>; // {"Monday": {startTime, endTime}, "Wednesday": {...}}
  schedulingPriority: "Low" | "Medium" | "High";
  additionalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Announcement {
  id?: string;
  title: string;
  content: string;
  createdBy?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  updatedAt?: string;
  attachments?: Array<{
    id?: string;
    filename: string;
    url: string;
  }>;
}
