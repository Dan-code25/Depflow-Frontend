import { useState } from "react";
import { Trash2, Award, FileText, Users, Briefcase } from "lucide-react";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import type { Credential } from "../../types/profile";

interface CredentialCardProps {
  credential: Credential;
  onDelete: () => void;
}

const getCredentialIcon = (type: string) => {
  switch (type) {
    case "certification":
      return Award;
    case "license":
      return FileText;
    case "seminar":
      return Users;
    case "experience":
      return Briefcase;
    default:
      return Award;
  }
};

const getDetailLines = (
  credential: Credential,
): { label: string; value: string }[] => {
  switch (credential.type) {
    case "certification":
      return [
        { label: "Organization:", value: credential.organization || "" },
        { label: "Year:", value: credential.yearObtained?.toString() || "" },
      ];
    case "license":
      return [
        { label: "Authority:", value: credential.issuingAuthority || "" },
        { label: "Year:", value: credential.yearObtained?.toString() || "" },
      ];
    case "seminar":
      return [
        { label: "Organizer:", value: credential.organizer || "" },
        { label: "Year:", value: credential.yearObtained?.toString() || "" },
      ];
    case "experience":
      return [
        { label: "Company:", value: credential.company || "" },
        {
          label: "Period:",
          value: `${credential.startYear}${credential.endYear ? ` - ${credential.isCurrentlyWorking ? "Present" : credential.endYear}` : " - Present"}`,
        },
      ];
    default:
      return [];
  }
};

export default function CredentialCard({
  credential,
  onDelete,
}: CredentialCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const IconComponent = getCredentialIcon(credential.type);
  const details = getDetailLines(credential);

  const handleDeleteClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleting(true);
    onDelete();
    setIsModalOpen(false);
    setIsDeleting(false);
  };

  return (
    <>
      <div className="p-4 border border-slate-200 rounded-lg">
        {/* Header with Icon and Content */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon and Content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-md bg-red-100 flex items-center justify-center">
                <IconComponent size={18} className="text-burgundy" />
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 text-sm break-words">
                {credential.title}
              </h4>
              <div className="mt-1 space-y-0.5">
                {details.map((detail, idx) => (
                  <p
                    key={idx}
                    className="text-xs sm:text-sm text-slate-600 break-words"
                  >
                    <span className="font-semibold text-slate-700">
                      {detail.label}
                    </span>{" "}
                    {detail.value}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDeleteClick}
            className="p-2 text-slate-400 hover:text-red-500 transition flex-shrink-0 ml-2 cursor-pointer"
            title="Delete credential"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        title="Delete Credential"
        message="Are you sure you want to delete this credential? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsModalOpen(false)}
        isLoading={isDeleting}
      />
    </>
  );
}
