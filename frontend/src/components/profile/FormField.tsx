interface FormFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  type?: string;
  placeholder?: string;
  isReadOnly?: boolean;
  options?: { label: string; value: string }[];
}

export default function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  isReadOnly = false,
  options,
}: FormFieldProps) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
        {label}
      </label>
      {isReadOnly ? (
        <div className="w-full px-3 py-2 text-sm sm:text-base border border-slate-200 rounded bg-slate-50 text-slate-700">
          {value}
        </div>
      ) : options ? (
        <select
          name={name}
          value={value || ""}
          onChange={onChange}
          className="w-full px-3 py-2 text-sm sm:text-base border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
        >
          {!value && (
            <option value="">{placeholder || "Select an option"}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm sm:text-base border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
        />
      )}
    </div>
  );
}
