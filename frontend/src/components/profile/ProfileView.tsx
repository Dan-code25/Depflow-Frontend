import type {
  ProfileData,
  Education,
  Credential,
  CredentialType,
  Research,
  Availability,
} from "../../types/profile";
import { Edit2 } from "lucide-react";
import EducationTab from "./EducationTab";
import CredentialsTab from "./CredentialsTab";
import ResearchTab from "./ResearchTab";
import AvailabilityTab from "./AvailabilityTab";

interface ProfileViewProps {
  data: ProfileData;
  activeTab: string;
  onEdit?: () => void;
  educations?: Education[];
  onAddEducation?: (education: Education) => void;
  onDeleteEducation?: (id: string | undefined) => void;
  credentials?: Credential[];
  onAddCredential?: (credential: Credential, type: CredentialType) => void;
  onDeleteCredential?: (id: string | undefined, type: CredentialType) => void;
  researches?: Research[];
  onAddResearch?: (research: Research) => void;
  onDeleteResearch?: (id: string | undefined) => void;
  availability?: Availability | null;
  onSaveAvailability?: (availability: Omit<Availability, "id" | "createdAt" | "updatedAt">) => void;
  onDeleteAvailability?: () => void;
  readOnly?: boolean;
}

const InfoField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="text-xs font-bold text-slate-500 uppercase block">
      {label}
    </label>
    <p
      className={`font-medium mt-1 truncate ${
        value ? "text-slate-900" : "text-slate-400 italic"
      }`}
    >
      {value || "Not provided"}
    </p>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-6">
    <h3 className="text-xs sm:text-sm font-bold text-burgundy uppercase mb-4">
      {title}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  </div>
);

export default function ProfileView({
  data,
  activeTab,
  onEdit,
  educations = [],
  onAddEducation,
  onDeleteEducation,
  credentials = [],
  onAddCredential,
  onDeleteCredential,
  researches = [],
  onAddResearch,
  onDeleteResearch,
  availability = null,
  onSaveAvailability,
  onDeleteAvailability,
  readOnly = false,
}: ProfileViewProps) {
  if (activeTab === "education") {
    return (
      <EducationTab
        educations={educations}
        onAdd={onAddEducation}
        onDelete={onDeleteEducation}
        readOnly={readOnly}
      />
    );
  }

  if (activeTab === "credentials") {
    return (
      <CredentialsTab
        credentials={credentials}
        onAdd={onAddCredential}
        onDelete={onDeleteCredential}
        readOnly={readOnly}
      />
    );
  }

  if (activeTab === "research") {
    return (
      <ResearchTab
        researches={researches}
        onAdd={onAddResearch}
        onDelete={onDeleteResearch}
        readOnly={readOnly}
      />
    );
  }

  if (activeTab === "availability") {
    return (
      <AvailabilityTab
        availability={availability}
        onSave={onSaveAvailability!}
        onDelete={onDeleteAvailability}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 sm:p-8 space-y-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs sm:text-sm font-bold text-burgundy uppercase">
            Basic Information
          </h3>
          {!readOnly && onEdit && (
            <button
              onClick={onEdit}
              className="px-3 sm:px-4 py-2 border-2 border-burgundy text-burgundy rounded hover:bg-burgundy hover:text-white transition flex items-center gap-2 text-sm"
            >
              <Edit2 size={18} />
              <span>Edit</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoField label="First Name" value={data.firstName} />
          <InfoField label="Last Name" value={data.lastName} />
          <InfoField label="Middle Name" value={data.middleName} />
          <InfoField label="Age" value={data.age?.toString() || ""} />
          <InfoField label="Birth Date" value={data.birthDate} />
          <InfoField label="Email" value={data.email} />
          <InfoField label="Contact No." value={data.contactNumber} />
        </div>
      </div>

      <Section title="Employment Details">
        <InfoField label="Employee ID" value={data.employeeId} />
        <InfoField label="Designation" value={data.designation} />
        <InfoField label="Employment Type" value={data.employmentType} />
        <InfoField label="Date Hired" value={data.dateHired} />
      </Section>

      <Section title="Address Details">
        <InfoField label="City" value={data.city} />
        <InfoField label="Province" value={data.province} />
      </Section>
    </div>
  );
}
