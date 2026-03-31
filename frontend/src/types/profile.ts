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
