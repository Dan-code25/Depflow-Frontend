export interface ProfileData {
  id?: string;
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
  isCurrentlyWorking?: boolean;
}

export interface Research {
  researchId?: string;
  title: string;
  journalConference: string;
  type:
    | "Journal"
    | "Conference"
    | "Thesis/Dissertation"
    | "Book/Chapter"
    | "Patent"
    | "Technical Report"
    | "Policy Brief"
    | "Research Project";
  year: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface Availability {
  facultyId: string;
  priority: "low" | "medium" | "high";
  maxClassesPerDay: number;
  maxConsecutiveHours: number;
  timeStart: string; // "07:00"
  timeEnd: string; // "19:00"
  preferredDays: string[];
  unavailableDays: string[];
  preferredRoomTypes: string[];
  unavailableTimeSlots: string[]; // ["07:00-09:00", "13:00-16:00"]
  subjectSpecializations: string[]; // Subjects they can teach (IDs)
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

export type DayTimeRange = {
  startTime: string;
  endTime: string;
};