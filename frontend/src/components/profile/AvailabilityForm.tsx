import { useState, useEffect } from "react";
import { AlertCircle, RotateCcw, X, Plus } from "lucide-react";
import type { Availability } from "../../types/profile";
import { getSubjects } from "../../services/availabilityService";
import { DAYS_OF_WEEK } from "../../utils/availabilityConstants";
import type { Subject } from "../../utils/availabilityConstants";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface TimeSlotDisplay {
  startTime: string;
  endTime: string;
}

interface AvailabilityFormProps {
  availability?: Availability | null;
  onSave: (availability: Omit<Availability, "createdAt" | "updatedAt">) => void;
  isLoading?: boolean;
}

export default function AvailabilityForm({
  availability,
  onSave,
  isLoading = false,
}: AvailabilityFormProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAvailabilityData, setPendingAvailabilityData] = useState<Omit<
    Availability,
    "createdAt" | "updatedAt"
  > | null>(null);

  const [formData, setFormData] = useState<{
    facultyId: string;
    priority: "low" | "medium" | "high";
    maxClassesPerDay: number;
    maxConsecutiveHours: number;
    timeStart: string;
    timeEnd: string;
    preferredDays: string[];
    unavailableDays: string[];
    preferredRoomTypes: string[];
    unavailableTimeSlots: TimeSlotDisplay[];
    subjectSpecializations: string[];
  }>({
    facultyId: availability?.facultyId || "",
    priority: (availability?.priority || "medium") as "low" | "medium" | "high",
    maxClassesPerDay: availability?.maxClassesPerDay || 3,
    maxConsecutiveHours: availability?.maxConsecutiveHours || 4,
    timeStart: availability?.timeStart || "07:00",
    timeEnd: availability?.timeEnd || "19:00",
    preferredDays: availability?.preferredDays || ([] as string[]),
    unavailableDays: availability?.unavailableDays || ([] as string[]),
    preferredRoomTypes: (availability?.preferredRoomTypes || []).map(
      (rt) => rt.charAt(0).toUpperCase() + rt.slice(1),
    ),
    unavailableTimeSlots: (availability?.unavailableTimeSlots || []).map(
      (slot) => {
        const [start, end] = slot.split("-");
        return { startTime: start, endTime: end };
      },
    ),
    subjectSpecializations:
      availability?.subjectSpecializations || ([] as string[]),
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

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Get unique subject names (deduplicated)
  const uniqueSubjectNames = Array.from(
    new Map(filteredSubjects.map((s) => [s.name, s])).keys(),
  );

  // Get all subject codes for a given name
  const getSubjectCodesByName = (name: string): string[] => {
    return subjects.filter((s) => s.name === name).map((s) => s.id);
  };

  // Check if a subject name is fully selected
  const isSubjectNameSelected = (name: string): boolean => {
    const codes = getSubjectCodesByName(name);
    return codes.every((code) =>
      formData.subjectSpecializations.includes(code),
    );
  };

  // Handle toggling entire subject name (all its codes)
  const handleSubjectNameToggle = (name: string) => {
    const codes = getSubjectCodesByName(name);
    const isSelected = isSubjectNameSelected(name);

    setFormData((prev) => ({
      ...prev,
      subjectSpecializations: isSelected
        ? prev.subjectSpecializations.filter((s) => !codes.includes(s))
        : [
            ...prev.subjectSpecializations,
            ...codes.filter((c) => !prev.subjectSpecializations.includes(c)),
          ],
    }));
    setErrors([]);
  };

  // Get unique selected subject names
  const getSelectedSubjectNames = (): string[] => {
    const uniqueNames = Array.from(
      new Map(subjects.map((s) => [s.name, s])).keys(),
    );
    return uniqueNames.filter(
      (name) =>
        getSubjectCodesByName(name).length > 0 &&
        getSubjectCodesByName(name).some((code) =>
          formData.subjectSpecializations.includes(code),
        ),
    );
  };

  const removeSubject = (name: string) => {
    const codes = getSubjectCodesByName(name);
    setFormData((prev) => ({
      ...prev,
      subjectSpecializations: prev.subjectSpecializations.filter(
        (s) => !codes.includes(s),
      ),
    }));
  };

  const handleDayToggle = (day: string, type: "preferred" | "unavailable") => {
    const field = type === "preferred" ? "preferredDays" : "unavailableDays";
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(day)
        ? prev[field].filter((d) => d !== day)
        : [...prev[field], day],
    }));
    setErrors([]);
  };

  const handleRoomTypeToggle = (roomType: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredRoomTypes: prev.preferredRoomTypes.includes(roomType)
        ? prev.preferredRoomTypes.filter((r) => r !== roomType)
        : [...prev.preferredRoomTypes, roomType],
    }));
    setErrors([]);
  };

  const addTimeSlot = () => {
    setFormData((prev) => ({
      ...prev,
      unavailableTimeSlots: [
        ...prev.unavailableTimeSlots,
        { startTime: "12:00", endTime: "13:00" },
      ],
    }));
    setErrors([]);
  };

  const removeTimeSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      unavailableTimeSlots: prev.unavailableTimeSlots.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const handleTimeSlotChange = (
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      unavailableTimeSlots: prev.unavailableTimeSlots.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot,
      ),
    }));
    setErrors([]);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.currentTarget;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value) : value,
    }));
    setErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors: string[] = [];
    if (formData.maxClassesPerDay < 1) {
      validationErrors.push("Max classes per day must be at least 1");
    }
    if (formData.maxConsecutiveHours < 1) {
      validationErrors.push("Max consecutive hours must be at least 1");
    }
    if (formData.timeStart >= formData.timeEnd) {
      validationErrors.push("Start time must be before end time");
    }
    if (formData.subjectSpecializations.length === 0) {
      validationErrors.push("Please select at least one subject");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const availabilityData: Omit<Availability, "createdAt" | "updatedAt"> = {
      ...formData,
      unavailableTimeSlots: formData.unavailableTimeSlots.map(
        (slot) => `${slot.startTime}-${slot.endTime}`,
      ),
      preferredRoomTypes: formData.preferredRoomTypes.map((rt) =>
        rt.toLowerCase(),
      ),
    };

    setPendingAvailabilityData(availabilityData);
    setShowConfirmDialog(true);
  };

  const confirmSave = () => {
    if (!pendingAvailabilityData) return;

    setIsSaving(true);
    try {
      onSave(pendingAvailabilityData);
      setShowConfirmDialog(false);
      setPendingAvailabilityData(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setFormData({
      facultyId: "",
      priority: "medium",
      maxClassesPerDay: 3,
      maxConsecutiveHours: 4,
      timeStart: "07:00",
      timeEnd: "19:00",
      preferredDays: [],
      unavailableDays: [],
      preferredRoomTypes: [],
      unavailableTimeSlots: [],
      subjectSpecializations: [],
    });
    setErrors([]);
  };

  const roomTypes = ["Lecture", "Lab"];

  return (
    <>
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={availability ? "Update Availability" : "Create Availability"}
        message="Please confirm that you want to save your teaching availability settings."
        confirmText="Save"
        cancelText="Cancel"
        isLoading={isSaving}
        onConfirm={confirmSave}
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingAvailabilityData(null);
        }}
      />

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
              <AlertCircle
                size={20}
                className="text-red-600 flex-shrink-0 mt-0.5"
              />
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
          {/* Subject Specializations */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-3">
              Subjects You Can Teach
            </label>

            {subjectsLoading ? (
              <p className="text-sm text-slate-500">Loading subjects...</p>
            ) : subjects.length > 0 ? (
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
                  />
                </div>

                {/* Subject List - Searchable Dropdown */}
                {subjects.length > 0 && (
                  <div className="border border-slate-100 rounded-lg bg-white max-h-56 overflow-y-auto">
                    {uniqueSubjectNames.length > 0 ? (
                      <div className="divide-y">
                        {uniqueSubjectNames.map((subjectName) => (
                          <button
                            key={subjectName}
                            type="button"
                            onClick={() => {
                              handleSubjectNameToggle(subjectName);
                              setSearchQuery("");
                            }}
                            className={`w-full text-left px-4 py-3 transition flex items-center gap-3 hover:bg-burgundy/5 ${
                              isSubjectNameSelected(subjectName)
                                ? "bg-burgundy/10 border-l-2 border-burgundy"
                                : ""
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                                isSubjectNameSelected(subjectName)
                                  ? "border-burgundy bg-burgundy"
                                  : "border-slate-300"
                              }`}
                            >
                              {isSubjectNameSelected(subjectName) && (
                                <span className="text-white text-xs font-bold">
                                  ✓
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-slate-700 font-medium">
                              {subjectName}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-3 text-sm text-slate-500 italic">
                        No subjects found
                      </p>
                    )}
                  </div>
                )}

                {/* Selected Subjects */}
                {getSelectedSubjectNames().length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">
                      Selected ({getSelectedSubjectNames().length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getSelectedSubjectNames().map((subjectName) => (
                        <div
                          key={subjectName}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-burgundy text-white rounded-full text-sm font-medium"
                        >
                          <span>{subjectName}</span>
                          <button
                            type="button"
                            onClick={() => removeSubject(subjectName)}
                            className="hover:opacity-70 transition"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                No subjects available
              </p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
              Priority Level
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full sm:w-64 px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Max Classes and Consecutive Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                Max Classes Per Day
              </label>
              <input
                type="number"
                name="maxClassesPerDay"
                value={formData.maxClassesPerDay}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                Max Consecutive Hours
              </label>
              <input
                type="number"
                name="maxConsecutiveHours"
                value={formData.maxConsecutiveHours}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
              />
            </div>
          </div>

          {/* Overall Time Window */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-4">
              Overall Availability Window
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  name="timeStart"
                  value={formData.timeStart}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  name="timeEnd"
                  value={formData.timeEnd}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Preferred Days */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-4">
              Preferred Days
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DAYS_OF_WEEK.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.preferredDays.includes(day)}
                    onChange={() => handleDayToggle(day, "preferred")}
                    className="w-4 h-4 text-burgundy border-slate-200 rounded focus:ring-2 focus:ring-burgundy"
                  />
                  <span className="text-sm text-slate-700">{day}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Unavailable Days */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-4">
              Unavailable Days
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DAYS_OF_WEEK.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.unavailableDays.includes(day)}
                    onChange={() => handleDayToggle(day, "unavailable")}
                    className="w-4 h-4 text-burgundy border-slate-200 rounded focus:ring-2 focus:ring-burgundy"
                  />
                  <span className="text-sm text-slate-700">{day}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preferred Room Types */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-4">
              Preferred Room Types
            </label>
            <div className="grid grid-cols-2 gap-3">
              {roomTypes.map((roomType) => (
                <label
                  key={roomType}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.preferredRoomTypes.includes(roomType)}
                    onChange={() => handleRoomTypeToggle(roomType)}
                    className="w-4 h-4 text-burgundy border-slate-200 rounded focus:ring-2 focus:ring-burgundy"
                  />
                  <span className="text-sm text-slate-700">{roomType}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Unavailable Time Slots */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase block">
                Unavailable Time Slots
              </label>
              <button
                type="button"
                onClick={addTimeSlot}
                className="px-3 py-1 text-sm text-burgundy border border-burgundy rounded hover:bg-burgundy/5 transition flex items-center gap-1"
              >
                <Plus size={16} />
                <span>Add Slot</span>
              </button>
            </div>
            <div className="space-y-3">
              {formData.unavailableTimeSlots.map((slot, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Start
                    </label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        handleTimeSlotChange(index, "startTime", e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      End
                    </label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        handleTimeSlotChange(index, "endTime", e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTimeSlot(index)}
                    className="p-2 text-red-600 border border-red-200 rounded hover:bg-red-50 transition"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
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
    </>
  );
}
