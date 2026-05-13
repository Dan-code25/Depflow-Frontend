import { useState, useEffect } from "react";
import type { Availability } from "../../types/profile";
import { DAYS_OF_WEEK } from "../../utils/availabilityConstants";
import { getSubjects } from "../../services/availabilityService";
import type { Subject } from "../../utils/availabilityConstants";

interface AvailabilityDisplayProps {
  availability: Availability;
}

export default function AvailabilityDisplay({
  availability,
}: AvailabilityDisplayProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

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
    } finally {
      setSubjectsLoading(false);
    }
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.name || subjectId;
  };

  const capitalizeString = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8">
      <h3 className="text-xs sm:text-sm font-bold text-burgundy uppercase mb-6">
        Teaching Availability
      </h3>

      <div className="space-y-6">
        {/* Subjects */}
        <div>
          <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
            Subjects They Can Teach
          </h4>
          <div className="flex flex-wrap gap-2">
            {availability.subjectSpecializations.length > 0 ? (
              availability.subjectSpecializations.map((subjectId) => (
                <span
                  key={subjectId}
                  className="inline-block px-3 py-1 bg-burgundy text-white text-sm rounded-full font-medium"
                >
                  {subjectsLoading ? "Loading..." : getSubjectName(subjectId)}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">Not specified</p>
            )}
          </div>
        </div>

        {/* Priority */}
        <div>
          <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
            Priority Level
          </h4>
          <span className="inline-block px-3 py-1.5 text-sm font-medium rounded bg-burgundy text-white capitalize">
            {availability.priority}
          </span>
        </div>

        {/* Constraints */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
              Max Classes/Day
            </h4>
            <p className="text-slate-900 font-semibold">
              {availability.maxClassesPerDay}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
              Max Consecutive Hours
            </h4>
            <p className="text-slate-900 font-semibold">
              {availability.maxConsecutiveHours}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
              Availability Window
            </h4>
            <p className="text-slate-900 font-semibold text-sm">
              {availability.timeStart} - {availability.timeEnd}
            </p>
          </div>
        </div>

        {/* Preferred Days */}
        {availability.preferredDays.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
              Preferred Days
            </h4>
            <div className="flex flex-wrap gap-2">
              {availability.preferredDays.map((day) => (
                <span
                  key={day}
                  className="inline-block px-3 py-1 bg-burgundy/10 text-burgundy text-sm rounded-full border border-burgundy font-medium"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Unavailable Days */}
        {availability.unavailableDays.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
              Unavailable Days
            </h4>
            <div className="flex flex-wrap gap-2">
              {availability.unavailableDays.map((day) => (
                <span
                  key={day}
                  className="inline-block px-3 py-1 bg-burgundy text-white text-sm rounded-full font-medium"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferred Room Types */}
        {availability.preferredRoomTypes.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
              Preferred Room Types
            </h4>
            <div className="flex flex-wrap gap-2">
              {availability.preferredRoomTypes.map((roomType) => (
                <span
                  key={roomType}
                  className="inline-block px-3 py-1 bg-burgundy/10 text-burgundy text-sm rounded-full border border-burgundy font-medium"
                >
                  {capitalizeString(roomType)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Unavailable Time Slots */}
        {availability.unavailableTimeSlots.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">
              Unavailable Time Slots
            </h4>
            <div className="space-y-2">
              {availability.unavailableTimeSlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                >
                  <span className="text-slate-700 font-medium">{slot}</span>
                  <div className="w-2 h-2 bg-burgundy rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
