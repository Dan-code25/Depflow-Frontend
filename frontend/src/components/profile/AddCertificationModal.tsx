import { useState } from "react";
import { X } from "lucide-react";
import type { Credential } from "../../types/profile";

interface AddCertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { credential: Credential }) => void;
}

const currentYear = new Date().getFullYear();

export default function AddCertificationModal({
  isOpen,
  onClose,
  onSubmit,
}: AddCertificationModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    organization: "",
    yearObtained: currentYear,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "yearObtained" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const credential: Credential = {
      type: "certification",
      title: formData.title,
      organization: formData.organization,
      yearObtained: formData.yearObtained,
    };

    onSubmit({ credential });

    // Reset form
    setFormData({
      title: "",
      organization: "",
      yearObtained: currentYear,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-bold text-burgundy">
            Add Certification
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition"
            aria-label="Close modal"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              Certification Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., AWS Certified Solutions Architect"
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          {/* Organization */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              Organization
            </label>
            <input
              type="text"
              name="organization"
              value={formData.organization}
              onChange={handleInputChange}
              placeholder="e.g., Amazon Web Services"
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          {/* Year Obtained */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              Year Obtained
            </label>
            <input
              type="number"
              name="yearObtained"
              value={formData.yearObtained}
              onChange={handleInputChange}
              min="1900"
              max={currentYear}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-burgundy rounded hover:bg-burgundy/90 transition flex items-center justify-center gap-2"
            >
              <span>✓</span> Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
