import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { AddFacultyFormData } from "../../types/faculty";
import {
  CORE_GROUPS,
  EMPLOYMENT_TYPES,
  DESIGNATIONS,
  GENDER_OPTIONS,
} from "../../constants/faculty";

interface AddFacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddFacultyFormData) => void;
  isLoading?: boolean;
}

const INITIAL_FORM_DATA: AddFacultyFormData = {
  email: "",
  firstName: "",
  lastName: "",
  middleName: "",
  gender: "",
  contactNumber: "",
  coreGroup: "IT CORE",
  employmentType: "Full-Time",
  employeeId: "",
  dateHired: "",
  designation: "",
};

export function AddFacultyModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: AddFacultyModalProps) {
  const [formData, setFormData] =
    useState<AddFacultyFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
    }
  }, [isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = "Employee ID is required";
    }

    if (!formData.dateHired) {
      newErrors.dateHired = "Date hired is required";
    }

    if (!formData.designation.trim()) {
      newErrors.designation = "Designation is required";
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    }

    if (!formData.gender.trim()) {
      newErrors.gender = "Gender is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
  };

  if (!isOpen) return null;

  // Check if form is complete (all required fields filled)
  const isFormComplete =
    formData.email.trim() &&
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.contactNumber.trim() &&
    formData.gender.trim() &&
    formData.employeeId.trim() &&
    formData.dateHired &&
    formData.designation.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-charcoal">
            Add Faculty Member
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          {/* First Row: Email and First Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Email *
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="user@tup.edu.ph"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition ${
                  errors.email ? "border-red-500 bg-red-50" : "border-slate-300"
                }`}
              />
              {errors.email && (
                <p className="text-red-600 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                First Name *
              </label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder=""
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition ${
                  errors.firstName
                    ? "border-red-500 bg-red-50"
                    : "border-slate-300"
                }`}
              />
              {errors.firstName && (
                <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>
          </div>

          {/* Second Row: Last Name and Middle Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Last Name *
              </label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder=""
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition ${
                  errors.lastName
                    ? "border-red-500 bg-red-50"
                    : "border-slate-300"
                }`}
              />
              {errors.lastName && (
                <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="middleName"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Middle Name
              </label>
              <input
                id="middleName"
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleInputChange}
                placeholder=""
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Contact Number and Gender Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contactNumber"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Contact Number *
              </label>
              <input
                id="contactNumber"
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
                placeholder="09XXXXXXXXX"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition ${
                  errors.contactNumber
                    ? "border-red-500 bg-red-50"
                    : "border-slate-300"
                }`}
              />
              {errors.contactNumber && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.contactNumber}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Gender *
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition cursor-pointer ${
                  errors.gender
                    ? "border-red-500 bg-red-50"
                    : "border-slate-300"
                }`}
              >
                <option value="">Select gender...</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.gender && (
                <p className="text-red-600 text-xs mt-1">{errors.gender}</p>
              )}
            </div>
          </div>

          {/* Third Row: Core Group and Employment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="coreGroup"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Core Group *
              </label>
              <select
                id="coreGroup"
                name="coreGroup"
                value={formData.coreGroup}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition cursor-pointer"
              >
                {CORE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="employmentType"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Employment Type *
              </label>
              <select
                id="employmentType"
                name="employmentType"
                value={formData.employmentType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition"
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fourth Row: Employee ID and Date Hired */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="employeeId"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Employee ID *
              </label>
              <input
                id="employeeId"
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                placeholder="TUPM-XX-XXXX"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition ${
                  errors.employeeId
                    ? "border-red-500 bg-red-50"
                    : "border-slate-300"
                }`}
              />
              {errors.employeeId && (
                <p className="text-red-600 text-xs mt-1">{errors.employeeId}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="dateHired"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Date Hired *
              </label>
              <input
                id="dateHired"
                type="date"
                name="dateHired"
                value={formData.dateHired}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition ${
                  errors.dateHired
                    ? "border-red-500 bg-red-50"
                    : "border-slate-300"
                }`}
              />
              {errors.dateHired && (
                <p className="text-red-600 text-xs mt-1">{errors.dateHired}</p>
              )}
            </div>
          </div>

          {/* Designation */}
          <div>
            <label
              htmlFor="designation"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Designation/Role *
            </label>
            <select
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition ${
                errors.designation
                  ? "border-red-500 bg-red-50"
                  : "border-slate-300"
              }`}
            >
              <option value="">Select a designation...</option>
              {DESIGNATIONS.map((designation) => (
                <option key={designation} value={designation}>
                  {designation}
                </option>
              ))}
            </select>
            {errors.designation && (
              <p className="text-red-600 text-xs mt-1">{errors.designation}</p>
            )}
          </div>

          {/* Form Note */}
          <p className="text-xs text-slate-500 italic">* Required fields</p>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-slate-700 font-semibold hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormComplete || isLoading}
            className="px-4 py-2 bg-gradient-to-r from-burgundy to-burgundy/90 hover:from-burgundy/90 hover:to-burgundy/80 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
          >
            {isLoading ? "Adding..." : "Add Faculty"}
          </button>
        </div>
      </div>
    </div>
  );
}
