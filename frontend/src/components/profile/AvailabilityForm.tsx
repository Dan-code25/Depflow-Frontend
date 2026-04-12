import { useState, useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import type { Availability, DayTimeRange } from "../../types/profile";
import { getSubjects } from "../../services/availabilityService";
import { validateAvailabilityForm } from "../../utils/availabilityHelpers";
import { DAYS_OF_WEEK, PRIORITIES } from "../../utils/availabilityConstants";
import type { Subject } from "../../utils/availabilityConstants";

interface AvailabilityFormProps {
  availability?: Availability | null;
  onSave: (availability: Omit<Availability, "id" | "createdAt" | "updatedAt">) => void;
  isLoading?: boolean;
}

export default function AvailabilityForm({
  availability,
  onSave,
  isLoading = false,
}: AvailabilityFormProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    subjectIds: availability?.subjectIds || [] as string[],
    dayTimeRanges: availability?.dayTimeRanges || ({} as Record<string, DayTimeRange>),
    schedulingPriority: (availability?.schedulingPriority || "Medium") as "Low" | "Medium" | "High",
    additionalNotes: availability?.additionalNotes || "",
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setErrors(["Failed to load subjects"]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setFormData((prev) => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter((id) => id !== subjectId)
        : [...prev.subjectIds, subjectId],
    }));
    setErrors([]);
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => {
      const newRanges = { ...prev.dayTimeRanges };
      if (newRanges[day]) {
        delete newRanges[day];
      } else {
        newRanges[day] = { startTime: "09:00", endTime: "12:00" };
      }
      return {
        ...prev,
        dayTimeRanges: newRanges,
      };
    });
    setErrors([]);
  };

  const handleTimeChange = (day: string, field: "startTime" | "endTime", value: string) => {
    setFormData((prev) => ({
      ...prev,
      dayTimeRanges: {
        ...prev.dayTimeRanges,
        [day]: {
          ...prev.dayTimeRanges[day],
          [field]: value,
        },
      },
    }));
    setErrors([]);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateAvailabilityForm(
      formData.subjectIds,
      formData.dayTimeRanges,
    );

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    const availabilityData: Omit<Availability, "id" | "createdAt" | "updatedAt"> = {
      subjectIds: formData.subjectIds,
      subjectNames: formData.subjectIds
        .map((id) => subjects.find((s) => s.id === id)?.name || "")
        .filter(Boolean),
      dayTimeRanges: formData.dayTimeRanges,
      schedulingPriority: formData.schedulingPriority,
      additionalNotes: formData.additionalNotes || undefined,
    };

    try {
      onSave(availabilityData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setFormData({
      subjectIds: [],
      dayTimeRanges: {},
      schedulingPriority: "Medium",
      additionalNotes: "",
    });
    setErrors([]);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs sm:text-sm font-bold text-burgundy uppercase">
          {availability ? "Edit" : "Set"} Teaching Availability
        </h3>
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition flex items-center gap-2"
        >
          <RotateCcw size={16} />
          <span>Clear</span>
        </button>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              {errors.map((error, idx) => (
                <p key={idx} className="text-sm text-red-700">
                  {error}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Subject Selection */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-4">
            Subjects You Can Teach
          </label>
          {subjectsLoading ? (
            <p className="text-sm text-slate-500">Loading subjects...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map((subject) => (
                <label key={subject.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.subjectIds.includes(subject.id)}
                    onChange={() => handleSubjectToggle(subject.id)}
                    className="w-4 h-4 text-burgundy border-slate-200 rounded focus:ring-2 focus:ring-burgundy"
                  />
                  <span className="text-sm text-slate-700">{subject.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Days and Times Grid */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-4">
            Days &amp; Time Availability
          </label>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={!!formData.dayTimeRanges[day]}
                    onChange={() => handleDayToggle(day)}
                    className="w-4 h-4 text-burgundy border-slate-200 rounded focus:ring-2 focus:ring-burgundy"
                  />
                  <span className="font-semibold text-slate-900">{day}</span>
                </div>

                {formData.dayTimeRanges[day] && (
                  <div className="grid grid-cols-2 gap-3 ml-7">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={formData.dayTimeRanges[day].startTime}
                        onChange={(e) =>
                          handleTimeChange(day, "startTime", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={formData.dayTimeRanges[day].endTime}
                        onChange={(e) =>
                          handleTimeChange(day, "endTime", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scheduling Priority */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
            Scheduling Priority
          </label>
          <select
            name="schedulingPriority"
            value={formData.schedulingPriority}
            onChange={handleInputChange}
            className="w-full sm:w-64 px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            How strictly should your time preferences be respected during scheduling
          </p>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleInputChange}
            placeholder="e.g., Prefer morning sessions, available for large classes, etc."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={isSaving || isLoading || subjectsLoading}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-burgundy rounded hover:bg-burgundy/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>✓</span> {availability ? "Update" : "Save"} Availability
          </button>
        </div>
      </form>
    </div>
  );
}
