import type { Availability } from "../../types/profile";

interface AvailabilityDisplayProps {
  availability: Availability;
}

export default function AvailabilityDisplay({ availability }: AvailabilityDisplayProps) {
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
            {availability.subjectNames.map((subject) => (
              <span
                key={subject}
                className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>

        {/* Availability Schedule */}
        <div>
          <h4 className="text-xs font-bold text-slate-600 uppercase mb-3">
            Weekly Schedule
          </h4>
          <div className="space-y-2">
            {Object.entries(availability.dayTimeRanges).map(([day, times]) => (
              <div key={day} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-semibold text-slate-900">{day}</span>
                <span className="text-slate-600">
                  {times.startTime} - {times.endTime}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
            Scheduling Priority
          </h4>
          <span
            className={`inline-block px-3 py-1 text-sm font-medium rounded ${
              availability.schedulingPriority === "High"
                ? "bg-red-100 text-red-700"
                : availability.schedulingPriority === "Medium"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
            }`}
          >
            {availability.schedulingPriority}
          </span>
        </div>

        {/* Notes */}
        {availability.additionalNotes && (
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
              Additional Notes
            </h4>
            <p className="text-slate-700 italic">{availability.additionalNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
