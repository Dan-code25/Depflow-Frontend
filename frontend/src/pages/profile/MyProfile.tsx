import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { FacultyLayout } from "../../components/layout/FacultyLayout";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileSidebar from "../../components/profile/ProfileSidebar";
import ProfileTabs from "../../components/profile/ProfileTabs";
import ProfileView from "../../components/profile/ProfileView";
import ProfileEdit from "../../components/profile/ProfileEdit";
import type { ProfileData, Education, Credential, Research } from "../../types/profile";

import {
  getPersonalInfo,
  getProfilePicture,
  updatePersonalInfo,
  updateProfilePicture,
} from "../../services/profileService";
import {
  addEducation,
  getEducations,
  deleteEducation,
} from "../../services/educationService";
import {
  addCertification,
  addLicense,
  addSeminar,
  addExperience,
  deleteCertification,
  deleteLicense,
  deleteSeminar,
  deleteExperience,
  getCredentials,
} from "../../services/credentialsService";
import {
  addResearch,
  getResearch,
  deleteResearch,
} from "../../services/researchService";

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
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [researches, setResearches] = useState<Research[]>([]);

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

  const handleAddCredential = async (
    credential: Credential,
    type: "certification" | "license" | "seminar" | "experience",
  ) => {
    // Generate ID immediately (optimistic rendering)
    const optimisticId = Date.now().toString();

    try {
      const optimisticCredential = {
        ...credential,
        id: optimisticId,
        type,
      };

      // Add to state immediately (user sees card)
      setCredentials([...credentials, optimisticCredential]);

      // Send to backend in background
      let response;
      switch (type) {
        case "certification":
          response = await addCertification(credential);
          break;
        case "license":
          response = await addLicense(credential);
          break;
        case "seminar":
          response = await addSeminar(credential);
          break;
        case "experience":
          response = await addExperience(credential);
          break;
      }

      // Replace with backend response when available
      if (response) {
        // Map backend response to frontend credential format based on type
        let backendCredential: Credential;

        switch (type) {
          case "certification":
            backendCredential = {
              id: response.cert_id,
              type: "certification",
              title: response.title,
              organization: response.organization,
              yearObtained: response.year_obtained,
            };
            break;
          case "license":
            backendCredential = {
              id: response.license_id,
              type: "license",
              title: response.title,
              issuingAuthority: response.authority,
              yearObtained: response.year_obtained,
            };
            break;
          case "seminar":
            backendCredential = {
              id: response.seminar_id,
              type: "seminar",
              title: response.title,
              organizer: response.organizer,
              yearObtained: response.year_attended,
            };
            break;
          case "experience":
            backendCredential = {
              id: response.work_exp_id,
              type: "experience",
              title: response.job_title,
              company: response.company,
              startYear: response.start_year,
              endYear: response.end_year,
            };
            break;
          default:
            return;
        }

        setCredentials((prev) =>
          prev.map((c) => (c.id === optimisticId ? backendCredential : c)),
        );
      }
    } catch (error) {
      // On error, remove optimistic credential
      setCredentials((prev) => prev.filter((c) => c.id !== optimisticId));
      console.error("Failed to add credential:", error);
    }
  };

  const handleDeleteCredential = async (
    id: string | undefined,
    type: "certification" | "license" | "seminar" | "experience",
  ) => {
    if (!id) return;

    try {
      // Store the credential in case we need to restore it
      const deletedCredential = credentials.find((c) => c.id === id);

      // Remove from state immediately (optimistic)
      setCredentials((prev) => prev.filter((c) => c.id !== id));

      // Send delete request to backend
      switch (type) {
        case "certification":
          await deleteCertification(id);
          break;
        case "license":
          await deleteLicense(id);
          break;
        case "seminar":
          await deleteSeminar(id);
          break;
        case "experience":
          await deleteExperience(id);
          break;
      }
    } catch (error) {
      // On error, restore the credential
      const deletedCredential = credentials.find((c) => c.id === id);
      if (deletedCredential) {
        setCredentials((prev) => [...prev, deletedCredential]);
      }
      console.error("Failed to delete credential:", error);
    }
  };

  const handleAddResearch = async (research: Research) => {
    // Generate ID immediately (optimistic rendering)
    const optimisticId = Date.now().toString();

    try {
      const optimisticResearch = {
        ...research,
        researchId: optimisticId,
      };

      // Add to state immediately (user sees card)
      setResearches([...researches, optimisticResearch]);

      // Send to backend in background
      const response = await addResearch(research);

      // Replace with backend response when available
      if (response) {
        const backendResearch: Research = {
          researchId: response.res_id?.toString(),
          title: response.title,
          journalConference: response.journal_conference,
          type: response.research_type,
          year: response.published_year,
        };

        setResearches((prev) =>
          prev.map((r) => (r.researchId === optimisticId ? backendResearch : r)),
        );
      }
    } catch (error) {
      // On error, remove optimistic research
      setResearches((prev) => prev.filter((r) => r.researchId !== optimisticId));
      console.error("Failed to add research:", error);
    }
  };

  const handleDeleteResearch = async (id: string | undefined) => {
    if (!id) return;

    try {
      // Store the research in case we need to restore it
      const deletedResearch = researches.find((r) => r.researchId === id);

      // Remove from state immediately (optimistic)
      setResearches((prev) => prev.filter((r) => r.researchId !== id));

      // Send delete request to backend
      await deleteResearch(id);
    } catch (error) {
      // On error, restore the research
      const deletedResearch = researches.find((r) => r.researchId === id);
      if (deletedResearch) {
        setResearches((prev) => [...prev, deletedResearch]);
      }
      console.error("Failed to delete research:", error);
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

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const credentialsData = await getCredentials();
        setCredentials(credentialsData);
      } catch (error) {
        console.error("Failed to fetch credentials data:", error);
      }
    };
    fetchCredentials();
  }, []);

  useEffect(() => {
    const fetchResearchData = async () => {
      try {
        const researchData = await getResearch();
        setResearches(researchData);
      } catch (error) {
        console.error("Failed to fetch research data:", error);
      }
    };
    fetchResearchData();
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
                credentials={credentials}
                onAddCredential={handleAddCredential}
                onDeleteCredential={handleDeleteCredential}
                researches={researches}
                onAddResearch={handleAddResearch}
                onDeleteResearch={handleDeleteResearch}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
