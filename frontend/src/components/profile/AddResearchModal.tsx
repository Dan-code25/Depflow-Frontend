import { useState } from "react";
import { X } from "lucide-react";
import type { Research } from "../../types/profile";

interface AddResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (research: Research) => void;
  initialData?: Research;
}

const currentYear = new Date().getFullYear();

export default function AddResearchModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: AddResearchModalProps) {
  const [formData, setFormData] = useState<Research>(
    initialData || {
      title: "",
      journalConference: "",
      type: "Journal",
      year: currentYear,
    },
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "year" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);

    // Reset form
    setFormData({
      title: "",
      journalConference: "",
      type: "Journal",
      year: currentYear,
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
            Add Research / Publication
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="text-xs sm:text-sm font-bold text-slate-500 uppercase block mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Publication title"
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          {/* Journal / Conference */}
          <div>
            <label className="text-xs sm:text-sm font-bold text-slate-500 uppercase block mb-2">
              Journal / Conference
            </label>
            <input
              type="text"
              name="journalConference"
              value={formData.journalConference}
              onChange={handleInputChange}
              placeholder="e.g. IEEE Transactions..."
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          {/* Type and Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-500 uppercase block mb-2">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent cursor-pointer"
              >
                <option value="Journal">Journal</option>
                <option value="Conference">Conference</option>
                <option value="Thesis/Dissertation">Thesis/Dissertation</option>
                <option value="Book/Chapter">Book/Chapter</option>
                <option value="Patent">Patent</option>
                <option value="Technical Report">Technical Report</option>
                <option value="Policy Brief">Policy Brief</option>
                <option value="Research Project">Research Project</option>
              </select>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-500 uppercase block mb-2">
                Year
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                min="1900"
                max={currentYear}
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
              className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-burgundy rounded hover:bg-burgundy/90 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>✓</span> Add Research
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
