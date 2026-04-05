import { useState } from "react";
import CredentialCard from "./CredentialCard";
import AddCertificationModal from "./AddCertificationModal";
import AddLicenseModal from "./AddLicenseModal";
import AddSeminarModal from "./AddSeminarModal";
import AddExperienceModal from "./AddExperienceModal";
import AddButton from "../common/AddButton";
import type { Credential, CredentialType } from "../../types/profile";

interface CredentialsTabProps {
  credentials: Credential[];
  onAdd?: (credential: Credential, type: CredentialType) => void;
  onDelete?: (id: string | undefined, type: CredentialType) => void;
  readOnly?: boolean;
}

const CREDENTIAL_SECTIONS: { type: CredentialType; label: string }[] = [
  { type: "certification", label: "Certifications" },
  { type: "license", label: "Licenses" },
  { type: "seminar", label: "Seminars" },
  { type: "experience", label: "Work Experiences" },
];

export default function CredentialsTab({
  credentials,
  onAdd,
  onDelete,
  readOnly = false,
}: CredentialsTabProps) {
  const [certificationModalOpen, setCertificationModalOpen] = useState(false);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [seminarModalOpen, setSeminarModalOpen] = useState(false);
  const [experienceModalOpen, setExperienceModalOpen] = useState(false);

  const getCredentialsByType = (type: CredentialType) => {
    return credentials.filter((cred) => cred.type === type);
  };

  const handleAddCredential = (
    data: { credential: Credential },
    type: CredentialType,
  ) => {
    onAdd?.(data.credential, type);
    closeModal(type);
  };

  const handleDeleteCredential = (
    id: string | undefined,
    type: CredentialType,
  ) => {
    onDelete?.(id, type);
  };

  const openModal = (type: CredentialType) => {
    switch (type) {
      case "certification":
        setCertificationModalOpen(true);
        break;
      case "license":
        setLicenseModalOpen(true);
        break;
      case "seminar":
        setSeminarModalOpen(true);
        break;
      case "experience":
        setExperienceModalOpen(true);
        break;
    }
  };

  const closeModal = (type: CredentialType) => {
    switch (type) {
      case "certification":
        setCertificationModalOpen(false);
        break;
      case "license":
        setLicenseModalOpen(false);
        break;
      case "seminar":
        setSeminarModalOpen(false);
        break;
      case "experience":
        setExperienceModalOpen(false);
        break;
    }
  };

  return (
    <div className="space-y-8">
      {/* Credentials Sections */}
      {CREDENTIAL_SECTIONS.map((section) => {
        const sectionCredentials = getCredentialsByType(section.type);
        const isEmpty = sectionCredentials.length === 0;

        return (
          <div
            key={section.type}
            className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8"
          >
            {/* Section Title */}
            <h3 className="text-xs sm:text-sm font-bold text-burgundy uppercase mb-6">
              {section.label}
            </h3>

            {/* Credentials List or Empty State */}
            <div className="space-y-4 mb-6">
              {isEmpty ? (
                <p className="text-slate-500 text-center py-4 text-sm">
                  {section.type === "experience"
                    ? "No work experiences added yet"
                    : `No ${section.label.toLowerCase()} added yet`}
                </p>
              ) : (
                sectionCredentials.map((credential) => (
                  <CredentialCard
                    key={credential.id}
                    credential={credential}
                    onDelete={
                      !readOnly
                        ? () =>
                            handleDeleteCredential(credential.id, section.type)
                        : undefined
                    }
                  />
                ))
              )}
            </div>

            {/* Add Button */}
            {!readOnly && onAdd && (
              <AddButton
                label={`Add ${section.label.slice(0, -1)}`}
                onClick={() => openModal(section.type)}
              />
            )}
          </div>
        );
      })}

      {/* Modals - Only render in edit mode */}
      {!readOnly && onAdd && (
        <>
          <AddCertificationModal
            isOpen={certificationModalOpen}
            onClose={() => closeModal("certification")}
            onSubmit={(cred) => handleAddCredential(cred, "certification")}
          />
          <AddLicenseModal
            isOpen={licenseModalOpen}
            onClose={() => closeModal("license")}
            onSubmit={(cred) => handleAddCredential(cred, "license")}
          />
          <AddSeminarModal
            isOpen={seminarModalOpen}
            onClose={() => closeModal("seminar")}
            onSubmit={(cred) => handleAddCredential(cred, "seminar")}
          />
          <AddExperienceModal
            isOpen={experienceModalOpen}
            onClose={() => closeModal("experience")}
            onSubmit={(cred) => handleAddCredential(cred, "experience")}
          />
        </>
      )}
    </div>
  );
}
