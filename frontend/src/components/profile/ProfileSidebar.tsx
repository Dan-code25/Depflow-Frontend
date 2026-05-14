import type { ProfileData } from "../../types/profile";
import { Mail, Phone, Briefcase, Clock, Camera, Zap } from "lucide-react";
import profilePlaceholder from "../../assets/profile-placeholder.svg";
import { useState, useEffect } from "react";
import { getLoadUnits } from "../../services/dashboardService";

interface ProfileSidebarProps {
  data: ProfileData;
  onProfilePictureChange?: (file: File) => void;
  readOnly?: boolean;
}

export default function ProfileSidebar({
  data,
  onProfilePictureChange,
  readOnly = false,
}: ProfileSidebarProps) {
  const [currentUnits, setCurrentUnits] = useState<number>(0);
  const [maxUnits, setMaxUnits] = useState<number>(24);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  useEffect(() => {
    const fetchLoadUnits = async () => {
      try {
        setIsLoadingUnits(true);
        const data = await getLoadUnits();
        setCurrentUnits(data.currentUnits);
        setMaxUnits(data.maxUnits);
      } catch (error) {
        console.error("Error fetching load units:", error);
        setCurrentUnits(0);
        setMaxUnits(24);
      } finally {
        setIsLoadingUnits(false);
      }
    };

    fetchLoadUnits();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onProfilePictureChange) {
      onProfilePictureChange(file);
    }
  };

  // Get load color based on percentage
  const getLoadColor = () => {
    const percentage = (currentUnits / maxUnits) * 100;

    if (currentUnits >= maxUnits) {
      return { bar: "bg-red-600", text: "text-red-600" };
    } else if (percentage > 70) {
      return { bar: "bg-amber-500", text: "text-amber-600" };
    } else {
      return { bar: "bg-green-600", text: "text-green-600" };
    }
  };

  const loadColor = getLoadColor();
  const percentage = (currentUnits / maxUnits) * 100;

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="bg-white rounded-lg overflow-hidden shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="bg-gradient-to-r from-burgundy to-burgundy/90 h-24 sm:h-28"></div>
        <div className="px-4 pb-6 flex flex-col items-center -mt-12 sm:-mt-14 relative z-10">
          <div className="relative">
            <img
              src={data.profilePicture || profilePlaceholder}
              alt="Profile"
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex-shrink-0 border-4 border-white object-cover shadow-lg"
            />
            {!readOnly && (
              <label className="absolute bottom-0 right-0 bg-burgundy text-white p-2.5 rounded-full cursor-pointer hover:bg-burgundy/90 transition-all shadow-md hover:shadow-lg group">
                <Camera size={18} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-center mt-4 text-charcoal">
            {data.firstName} {data.lastName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {data.title}
          </p>
        </div>

        {/* Contact Info Section */}
        <div className="px-5 py-5 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <h3 className="text-xs font-bold text-burgundy uppercase mb-4 tracking-wide">
            Contact Info
          </h3>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0">
                <Mail size={16} className="text-burgundy" />
              </div>
              <span className="text-slate-700 truncate font-medium">
                {data.email}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0">
                <Phone size={16} className="text-burgundy" />
              </div>
              <span className="text-slate-700 truncate font-medium">
                {data.contactNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Employment Info Section */}
        <div className="px-5 py-5 border-t border-slate-200">
          <h3 className="text-xs font-bold text-burgundy uppercase mb-4 tracking-wide">
            Employment Info
          </h3>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0">
                <Briefcase size={16} className="text-burgundy" />
              </div>
              <span className="text-slate-700 truncate font-medium">
                {data.employeeId}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0">
                <Clock size={16} className="text-burgundy" />
              </div>
              <span className="text-slate-700 truncate font-medium">
                {data.employmentType}
              </span>
            </div>
          </div>
        </div>

        {/* Load Units Section */}
        <div className="px-5 py-5 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Zap
              size={16}
              className={isLoadingUnits ? "text-burgundy" : loadColor.text}
            />
            <h3 className="text-xs font-bold text-burgundy uppercase tracking-wide">
              Load Units
            </h3>
          </div>
          {isLoadingUnits ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-4 h-4 border-2 border-burgundy border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Units Display */}
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${loadColor.text}`}>
                  {currentUnits}
                </span>
                <span className="text-xs text-slate-600">
                  / {maxUnits} units
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${loadColor.bar}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
