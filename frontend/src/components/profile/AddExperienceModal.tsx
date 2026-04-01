import { useState } from "react";
import { X } from "lucide-react";
import type { Credential } from "../../types/profile";

interface AddExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { credential: Credential }) => void;
}

const currentYear = new Date().getFullYear();

export default function AddExperienceModal({
  isOpen,
  onClose,
  onSubmit,
}: AddExperienceModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    startYear: currentYear,
    endYear: currentYear,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name.includes("Year")
          ? parseInt(value) || 0
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const credential: Credential = {
      type: "experience",
      title: formData.title,
      company: formData.company,
      startYear: formData.startYear,
      endYear: formData.endYear,
      yearObtained: formData.startYear,
    };

    onSubmit({ credential });

    // Reset form
    setFormData({
      title: "",
      company: "",
      startYear: currentYear,
      endYear: currentYear,
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
            Add Work Experience
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
          {/* Job Title */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              Job Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Senior Software Engineer"
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          {/* Company */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              Company
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              placeholder="e.g., Acme Corporation"
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          {/* Years */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                Start Year
              </label>
              <input
                type="number"
                name="startYear"
                value={formData.startYear}
                onChange={handleInputChange}
                min="1900"
                max={currentYear}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                End Year
              </label>
              <input
                type="number"
                name="endYear"
                value={formData.endYear}
                onChange={handleInputChange}
                min={formData.startYear}
                max={currentYear + 10}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
              />
            </div>
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
