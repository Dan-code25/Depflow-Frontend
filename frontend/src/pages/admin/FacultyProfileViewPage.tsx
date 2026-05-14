import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { FacultyLayout } from "../../components/layout/FacultyLayout";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileSidebar from "../../components/profile/ProfileSidebar";
import ProfileTabs from "../../components/profile/ProfileTabs";
import ProfileView from "../../components/profile/ProfileView";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import type {
  ProfileData,
  Education,
  Credential,
  Research,
  Availability,
} from "../../types/profile";
import type { Faculty } from "../../types/faculty";
import { getFacultyById } from "../../services/facultyService";
import { getFacultyEducations } from "../../services/educationService";
import { getFacultyCredentials } from "../../services/credentialsService";
import { getFacultyResearch } from "../../services/researchService";
import { getFacultyAvailability } from "../../services/availabilityService";
import { getFacultyProfilePicture } from "../../services/profileService";

// Helper to create empty profile data
const createEmptyProfileData = (): ProfileData => ({
  firstName: "",
  lastName: "",
  middleName: "",
  birthDate: "",
  email: "",
  contactNumber: "",
  employeeId: "",
  designation: "",
  employmentType: "",
  dateHired: "",
  city: "",
  province: "",
  title: "",
  age: undefined,
});

// Helper to convert Faculty data to ProfileData
const convertFacultyToProfileData = (faculty: Faculty): ProfileData => ({
  firstName: faculty.firstName,
  lastName: faculty.lastName,
  middleName: faculty.middleName || "",
  birthDate: "",
  email: faculty.email,
  contactNumber: faculty.contactNumber,
  employeeId: faculty.employeeId,
  designation: faculty.designation,
  employmentType: faculty.employmentType,
  dateHired: faculty.dateHired,
  city: "",
  province: "",
  title: "",
  age: undefined,
  profilePicture: faculty.profilePicture,
});

// Helper to get layout based on user role
const getLayoutByRole = (role: string | null) => {
  return role === "admin" ? AdminLayout : FacultyLayout;
};

// Helper to get back path based on user role
const getBackPathByRole = (role: string | null) => {
  return role === "admin" ? "/admin/manage-faculty" : "/faculty/information";
};

export default function FacultyProfileViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("personal");
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>("");
  const [educations, setEducations] = useState<Education[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [researches, setResearches] = useState<Research[]>([]);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userRole = localStorage.getItem("user_role");
  const Layout = getLayoutByRole(userRole);
  const backPath = getBackPathByRole(userRole);

  useEffect(() => {
    const fetchFacultyProfile = async () => {
      try {
        if (!id) return;
        setIsLoading(true);

        // Fetch all faculty data in parallel
        const [
          facultyData,
          educationData,
          credentialsData,
          researchData,
          availabilityData,
        ] = await Promise.all([
          getFacultyById(id),
          getFacultyEducations(id).catch(() => []),
          getFacultyCredentials(id).catch(() => []),
          getFacultyResearch(id).catch(() => []),
          getFacultyAvailability(id).catch(() => null),
        ]);

        setFaculty(facultyData);
        setEducations(educationData);
        setCredentials(credentialsData);
        setResearches(researchData);
        setAvailability(availabilityData);

        // Fetch profile picture separately (not critical)
        try {
          const pictureUrl = await getFacultyProfilePicture(id);
          setProfilePictureUrl(pictureUrl);
        } catch (error) {
          console.error("Failed to fetch profile picture:", error);
          // Continue without profile picture
        }
      } catch (error) {
        console.error("Failed to fetch faculty profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacultyProfile();
  }, [id]);

  const profileData = faculty
    ? {
        firstName: faculty.firstName,
        lastName: faculty.lastName,
        middleName: faculty.middleName || "",
        email: faculty.email,
        contactNumber: faculty.contactNumber,
        employeeId: faculty.employeeId,
        designation: faculty.designation,
        employmentType: faculty.employmentType,
        dateHired: faculty.dateHired,
        profilePicture: profilePictureUrl || faculty.profilePicture,
        birthDate: faculty.birthDate || "",
        age: faculty.age,
        city: faculty.city || "",
        province: faculty.province || "",
        title: faculty.title || "",
      }
    : createEmptyProfileData();
  const facultyName = faculty
    ? `${faculty.firstName} ${faculty.lastName}'s Profile`
    : "Profile";

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size="lg" color="burgundy" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Back Button */}
        <div className="container-main pt-6">
          <button
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 px-4 py-2 text-burgundy hover:text-burgundy/80 transition-colors font-medium cursor-pointer"
          >
            <ArrowLeft size={20} />
            Back
          </button>
        </div>

        {/* Header */}
        <div className="container-main">
          <ProfileHeader
            name={facultyName}
            description="View faculty member's information"
          />
        </div>

        {/* Profile Content */}
        <div className="container-main flex flex-col gap-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 w-full">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <ProfileSidebar
                data={profileData}
                onProfilePictureChange={() => {}}
                readOnly={true}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-4">
              <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
              <ProfileView
                data={profileData}
                activeTab={activeTab}
                onEdit={undefined}
                educations={educations}
                credentials={credentials}
                researches={researches}
                availability={availability}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
