import { useState } from "react";
import type { Education } from "../../types/profile";

interface EducationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (education: Education) => void;
  initialData?: Education;
}

export default function EducationModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: EducationModalProps) {
  const [formData, setFormData] = useState<Education>(
    initialData || {
      degreeLevel: "",
      degreeType: "",
      major: "",
      university: "",
      yearGraduated: new Date().getFullYear(),
    },
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "yearGraduated" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      degreeLevel: "",
      degreeType: "",
      major: "",
      university: "",
      yearGraduated: new Date().getFullYear(),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-6 text-sm font-bold text-burgundy uppercase">
          Add Education
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              Degree Level
            </label>
            <select
              name="degreeLevel"
              value={formData.degreeLevel}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent cursor-pointer"
            >
              <option value="">Select degree level</option>
              <option value="Bachelor">Bachelor</option>
              <option value="Master">Master</option>
              <option value="PhD">PhD</option>
              <option value="Associate">Associate</option>
            </select>
          </div>

          {formData.degreeLevel !== "PhD" && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                Degree Type
              </label>
              <select
                name="degreeType"
                value={formData.degreeType}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm sm:text-base border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent cursor-pointer"
              >
                <option value="">Select degree type</option>
                <option value="Science">Science</option>
                <option value="Arts">Arts</option>
                <option value="Business">Business</option>
                <option value="Engineering">Engineering</option>
                <option value="Medicine">Medicine</option>
                <option value="Education">Education</option>
                <option value="Law">Law</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              Major
            </label>
            <input
              type="text"
              name="major"
              value={formData.major}
              onChange={handleChange}
              placeholder="e.g., Computer Science"
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              University
            </label>
            <input
              type="text"
              name="university"
              value={formData.university}
              onChange={handleChange}
              placeholder="e.g., University of the Philippines"
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              Year Graduated
            </label>
            <input
              type="number"
              name="yearGraduated"
              value={formData.yearGraduated}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-burgundy rounded hover:bg-burgundy/90 transition cursor-pointer"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
