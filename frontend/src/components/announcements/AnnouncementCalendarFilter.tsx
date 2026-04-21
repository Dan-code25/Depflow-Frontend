import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Calendar } from "lucide-react";

interface AnnouncementCalendarFilterProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
}

export function AnnouncementCalendarFilter({
  selectedDate,
  onDateSelect,
}: AnnouncementCalendarFilterProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const days = Array.from(
    { length: getDaysInMonth(currentMonth) },
    (_, i) => i + 1,
  );
  const firstDay = getFirstDayOfMonth(currentMonth);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    onDateSelect(newDate);
    setShowCalendar(false);
  };

  const handleClear = () => {
    onDateSelect(null);
    setShowCalendar(false);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate &&
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="px-5 py-3.5 bg-white border border-slate-300 hover:border-burgundy/40 rounded-lg text-charcoal font-semibold text-sm flex items-center gap-2.5 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
      >
        <Calendar size={20} className="text-burgundy flex-shrink-0" />
        <span>
          {selectedDate ? selectedDate.toLocaleDateString() : "Filter by date"}
        </span>
      </button>

      {showCalendar && (
        <div className="absolute top-full z-50 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl p-5 w-80">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-600 cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-sm font-semibold text-charcoal">{monthName}</h3>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-600 cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-slate-500 py-2 h-8 flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-5">
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => (
              <button
                key={day}
                onClick={() => handleSelectDate(day)}
                className={`py-1.5 text-xs font-medium rounded-md transition-all duration-200 h-8 flex items-center justify-center cursor-pointer ${
                  isSelected(day)
                    ? "bg-burgundy text-white shadow-sm font-bold"
                    : isToday(day)
                      ? "bg-burgundy/20 text-burgundy font-bold border border-burgundy/30"
                      : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-slate-200">
            {selectedDate && (
              <button
                onClick={handleClear}
                className="flex-1 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors text-sm font-medium flex items-center justify-center gap-1 cursor-pointer"
              >
                <X size={16} />
                Clear
              </button>
            )}
            <button
              onClick={() => setShowCalendar(false)}
              className={`flex-1 px-3 py-2 bg-burgundy text-white rounded-md hover:bg-burgundy/90 transition-colors text-sm font-medium cursor-pointer ${
                !selectedDate ? "col-span-2" : ""
              }`}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
