import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { FacultyLayout } from "../../components/layout/FacultyLayout";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileSidebar from "../../components/profile/ProfileSidebar";
import ProfileTabs from "../../components/profile/ProfileTabs";
import ProfileView from "../../components/profile/ProfileView";
import ProfileEdit from "../../components/profile/ProfileEdit";
import type { ProfileData, Education } from "../../types/profile";

import {
  getPersonalInfo,
  getProfilePicture,
  updatePersonalInfo,
  updateProfilePicture,
} from "../../services/profileService";
import { addEducation, getEducations, deleteEducation } from "../../services/educationService";

export default function MyProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [profileData, setProfileData] = useState<ProfileData>({
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
  const [educations, setEducations] = useState<Education[]>([]);

  const handleTabChange = (tab: string) => {
    if (isEditing) {
      setIsEditing(false);
    }
    setActiveTab(tab);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => setIsEditing(false);
  const handleSave = async () => {
    try {
      await updatePersonalInfo(profileData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save profile data:", error);
    }
  };

  const handleAddEducation = (education: Education) => {
    const newEducation = {
      ...education,
      edId: Date.now().toString(),
    };

    addEducation(newEducation);

    setEducations([...educations, newEducation]);
  };

  const handleDeleteEducation = async (id: string | undefined) => {
    try {
      if (!id) return;
      await deleteEducation(id);
      setEducations((prev) => prev.filter((edu) => edu.edId !== id));
    } catch (error) {
      console.error("Failed to delete education:", error);
    }
  };

  const userRole = localStorage.getItem("user_role");
  const Layout = userRole === "admin" ? AdminLayout : FacultyLayout;

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const data = await getPersonalInfo();
        setProfileData((prev) => ({
          ...prev,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          birthDate: data.birthdate,
          email: data.email,
          contactNumber: data.contactNumber,
          employeeId: data.employeeId,
          designation: data.designation,
          employmentType: data.employmentType,
          dateHired: data.dateHired,
          city: data.city,
          province: data.province,
          title: data.title,
          age: data.age,
        }));
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      }
    };
    fetchProfileData();
  }, []);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const profilePicture = await getProfilePicture();
        setProfileData((prev) => ({
          ...prev,
          profilePicture: `${profilePicture}?t=${Date.now()}`,
        }));
      } catch (error) {
        console.error("Failed to fetch profile picture:", error);
      }
    };
    fetchProfilePicture();
  }, []);

  const handleProfilePictureChange = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setProfileData({
          ...profileData,
          profilePicture: base64,
        });
      };
      reader.readAsDataURL(file);

      const response = await updateProfilePicture(file);

      setProfileData((prev) => ({
        ...prev,
        profilePicture: `${response.profilePicture}?t=${Date.now()}`,
      }));
    } catch (error) {
      console.error("Failed to upload profile picture:", error);
    }
  };

  useEffect(() => {
    const fetchEducations = async () => {
      try {
        const educationData = await getEducations();
        setEducations(educationData);
      } catch (error) {
        console.error("Failed to fetch education data:", error);
      }
    };
    fetchEducations();
  }, []);

  return (
    <Layout>
      <div className="container-main flex flex-col gap-4 sm:gap-6">
        <ProfileHeader />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          <ProfileSidebar
            data={profileData}
            onProfilePictureChange={handleProfilePictureChange}
          />

          <div className="lg:col-span-3">
            <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {isEditing ? (
              <ProfileEdit
                data={profileData}
                onChange={setProfileData}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            ) : (
              <ProfileView
                data={profileData}
                activeTab={activeTab}
                onEdit={handleEdit}
                educations={educations}
                onAddEducation={handleAddEducation}
                onDeleteEducation={handleDeleteEducation}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
