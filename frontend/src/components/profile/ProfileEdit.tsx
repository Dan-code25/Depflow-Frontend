import { Save, X } from "lucide-react";
import type { ProfileData } from "../../types/profile";
import FormField from "./FormField";

interface ProfileEditProps {
  data: ProfileData;
  onChange: (data: ProfileData) => void;
  onSave: () => void;
  onCancel: () => void;
}

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="pb-8 border-b border-slate-200 last:pb-0 last:border-0">
    <h3 className="text-xs sm:text-sm font-bold text-burgundy uppercase mb-5 tracking-wide">
      {title}
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {children}
    </div>
  </div>
);

const DESIGNATION_OPTIONS = [
  { label: "Professor", value: "Professor" },
  { label: "Associate Professor", value: "Associate Professor" },
  { label: "Assistant Professor", value: "Assistant Professor" },
  { label: "Instructor", value: "Instructor" },
  { label: "Lecturer", value: "Lecturer" },
  { label: "Department Head", value: "Department Head" },
  { label: "Dean", value: "Dean" },
  { label: "Coordinator", value: "Coordinator" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: "Full-time", value: "Full-time" },
  { label: "Part-time", value: "Part-time" },
  { label: "Contract", value: "Contract" },
  { label: "Temporary", value: "Temporary" },
  { label: "Visiting", value: "Visiting" },
];

export default function ProfileEdit({
  data,
  onChange,
  onSave,
  onCancel,
}: ProfileEditProps) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    onChange({
      ...data,
      [name]:
        name === "age"
          ? value
            ? parseInt(value)
            : undefined
          : name === "teachingLoad"
            ? parseInt(value)
            : value,
    });
  };

  const userRole = localStorage.getItem("user_role");
  const isAdmin = userRole === "admin";
  const canEditEmployment = isAdmin;

  return (
    <div className="bg-white rounded-lg p-8 space-y-8 shadow-md border border-slate-200">
      <Section title="Basic Information">
        <FormField
          label="First Name"
          name="firstName"
          placeholder="Enter your first name"
          value={data.firstName}
          onChange={handleChange}
        />
        <FormField
          label="Last Name"
          name="lastName"
          placeholder="Enter your last name"
          value={data.lastName}
          onChange={handleChange}
        />
        <FormField
          label="Middle Name"
          name="middleName"
          placeholder="Enter your middle name"
          value={data.middleName}
          onChange={handleChange}
        />
        <FormField
          label="Age"
          name="age"
          type="number"
          placeholder="e.g. 30"
          value={data.age || ""}
          onChange={handleChange}
        />
        <FormField
          label="Birth Date"
          name="birthDate"
          type="date"
          placeholder="YYYY-MM-DD"
          value={data.birthDate}
          onChange={handleChange}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="your.email@example.com"
          value={data.email}
          onChange={handleChange}
        />
        <FormField
          label="Contact No."
          name="contactNumber"
          placeholder="+63 XXX XXX XXXX"
          value={data.contactNumber}
          onChange={handleChange}
        />
      </Section>

      <Section title="Employment Details">
        <FormField
          label="Employee ID"
          name="employeeId"
          placeholder="e.g. EMP-2024-0001"
          value={data.employeeId}
          onChange={handleChange}
          isReadOnly={!canEditEmployment}
        />
        <FormField
          label="Designation"
          name="designation"
          placeholder="Select a designation"
          value={data.designation}
          onChange={handleChange}
          options={DESIGNATION_OPTIONS}
          isReadOnly={!canEditEmployment}
        />
        <FormField
          label="Employment Type"
          name="employmentType"
          placeholder="Select employment type"
          value={data.employmentType}
          onChange={handleChange}
          options={EMPLOYMENT_TYPE_OPTIONS}
          isReadOnly={!canEditEmployment}
        />
        <FormField
          label="Date Hired"
          name="dateHired"
          type="date"
          placeholder="YYYY-MM-DD"
          value={data.dateHired}
          onChange={handleChange}
          isReadOnly={!canEditEmployment}
        />
      </Section>

      <Section title="Address Details">
        <FormField
          label="City"
          name="city"
          placeholder="e.g. Manila"
          value={data.city}
          onChange={handleChange}
        />
        <FormField
          label="Province"
          name="province"
          placeholder="e.g. Metro Manila"
          value={data.province}
          onChange={handleChange}
        />
      </Section>

      <div className="flex gap-3 pt-6 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 text-slate-700 hover:text-charcoal hover:bg-slate-100 rounded-lg transition-all duration-200 font-semibold flex items-center gap-2 cursor-pointer"
        >
          <X size={18} />
          <span>Cancel</span>
        </button>
        <button
          onClick={onSave}
          className="px-6 py-2.5 bg-gradient-to-r from-burgundy to-burgundy/90 hover:from-burgundy/90 hover:to-burgundy/80 text-white rounded-lg transition-all duration-200 font-semibold flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
        >
          <Save size={18} />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
