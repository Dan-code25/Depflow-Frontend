import { useState } from "react";
import { Clock } from "lucide-react";
import { inputCls } from "../common/Modal";

export function TimePickerClock({
  value,
  onChange,
  minTime,
  placeholder = "Select time...",
}: {
  value: string;
  onChange: (val: string) => void;
  minTime?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hour" | "minute">("hour");

  const parseTime = (t: string) => {
    if (!t) return { h: 7, m: 0 };
    const [h, m] = t.split(":").map(Number);
    return { h, m };
  };

  const { h, m } = parseTime(value);
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm: "AM" | "PM" = h < 12 ? "AM" : "PM";

  const buildTime = (dh: number, period: "AM" | "PM", mins: number) => {
    let h24 = dh;
    if (period === "PM" && dh !== 12) h24 = dh + 12;
    if (period === "AM" && dh === 12) h24 = 0;
    return `${String(h24).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  const selectHour = (hour: number) => {
    onChange(buildTime(hour, ampm, m));
    setMode("minute");
  };

  const selectMinute = (min: number) => {
    onChange(buildTime(displayHour, ampm, min));
    setOpen(false);
    setMode("hour");
  };

  const toggleAmPm = (period: "AM" | "PM") => {
    onChange(buildTime(displayHour, period, m));
  };

  const isBelowMin = (newVal: string) => {
    if (!minTime || !newVal) return false;
    return newVal <= minTime;
  };

  const SIZE = 208;
  const CENTER = SIZE / 2;
  const RADIUS = 78;
  const BTN = 32;

  const getPos = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: CENTER + RADIUS * Math.cos(angle) - BTN / 2,
      y: CENTER + RADIUS * Math.sin(angle) - BTN / 2,
    };
  };

  const handRotation =
    mode === "hour" ? ((displayHour % 12) / 12) * 360 : (m / 60) * 360;
  const handLength = RADIUS - 14;
  const displayValue = value
    ? `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`
    : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setMode("hour");
        }}
        className={`${inputCls} flex items-center justify-between gap-2`}
      >
        <span className={displayValue ? "text-gray-800" : "text-gray-400"}>
          {displayValue ?? placeholder}
        </span>
        <Clock size={15} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 p-4 w-[232px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setMode("hour")}
                className={`text-[22px] font-black px-1.5 py-0.5 rounded-lg transition-colors ${
                  mode === "hour"
                    ? "bg-[#FFF3F3] text-primary"
                    : "text-gray-400 hover:bg-gray-50"
                }`}
              >
                {String(displayHour).padStart(2, "0")}
              </button>
              <span className="text-[22px] font-black text-gray-200 select-none">:</span>
              <button
                onClick={() => setMode("minute")}
                className={`text-[22px] font-black px-1.5 py-0.5 rounded-lg transition-colors ${
                  mode === "minute"
                    ? "bg-[#FFF3F3] text-primary"
                    : "text-gray-400 hover:bg-gray-50"
                }`}
              >
                {String(m).padStart(2, "0")}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {(["AM", "PM"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => toggleAmPm(period)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                    ampm === period
                      ? "bg-[#8B0000] text-white"
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-semibold mb-2">
            {mode === "hour" ? "Select Hour" : "Select Minute"}
          </p>

          <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
            <div className="absolute inset-0 rounded-full bg-gray-50 border-2 border-gray-100" />

            {Array.from({ length: 60 }).map((_, i) => {
              const angle = (i / 60) * 360;
              const isMajor = i % 5 === 0;
              return (
                <div
                  key={i}
                  className={`absolute ${isMajor ? "bg-gray-300" : "bg-gray-200"}`}
                  style={{
                    width: isMajor ? 2 : 1,
                    height: isMajor ? 8 : 5,
                    left: CENTER - (isMajor ? 1 : 0.5),
                    top: 6,
                    transformOrigin: `50% ${CENTER - 6}px`,
                    transform: `rotate(${angle}deg)`,
                  }}
                />
              );
            })}

            <div
              className="absolute bg-[#8B0000] rounded-full"
              style={{
                width: 3,
                height: handLength,
                left: CENTER - 1.5,
                top: CENTER - handLength,
                transformOrigin: "50% 100%",
                transform: `rotate(${handRotation}deg)`,
                transition: "transform 0.15s ease",
              }}
            />
            <div
              className="absolute bg-[#8B0000] rounded-full z-10"
              style={{ width: 8, height: 8, left: CENTER - 4, top: CENTER - 4 }}
            />

            {mode === "hour" &&
              [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour, idx) => {
                const pos = getPos(idx, 12);
                const isSelected = hour === displayHour;
                const wouldBeInvalid = isBelowMin(buildTime(hour, ampm, m));
                return (
                  <button
                    key={hour}
                    onClick={() => !wouldBeInvalid && selectHour(hour)}
                    disabled={wouldBeInvalid}
                    className={`absolute w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-[#8B0000] text-white shadow-md scale-110"
                        : wouldBeInvalid
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-700 hover:bg-[#FFF3F3] hover:text-[#8B0000]"
                    }`}
                    style={{ left: pos.x, top: pos.y }}
                  >
                    {hour}
                  </button>
                );
              })}

            {mode === "minute" &&
              [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min, idx) => {
                const pos = getPos(idx, 12);
                const isSelected = m === min;
                const wouldBeInvalid = isBelowMin(buildTime(displayHour, ampm, min));
                return (
                  <button
                    key={min}
                    onClick={() => !wouldBeInvalid && selectMinute(min)}
                    disabled={wouldBeInvalid}
                    className={`absolute w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-[#8B0000] text-white shadow-md scale-110"
                        : wouldBeInvalid
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-700 hover:bg-[#FFF3F3] hover:text-[#8B0000]"
                    }`}
                    style={{ left: pos.x, top: pos.y }}
                  >
                    {String(min).padStart(2, "0")}
                  </button>
                );
              })}
          </div>

          {mode === "minute" && (
            <button
              onClick={() => {
                setOpen(false);
                setMode("hour");
              }}
              className="w-full mt-3 py-2 bg-[#8B0000] hover:bg-[#6B0000] text-white rounded-xl text-xs font-bold transition-colors"
            >
              Confirm Time
            </button>
          )}
        </div>
      )}
    </div>
  );
}