import type { ProfileData } from "../../types/profile";
import { Mail, Phone, Briefcase, Clock, Camera } from "lucide-react";
import profilePlaceholder from "../../assets/profile-placeholder.svg";

interface ProfileSidebarProps {
  data: ProfileData;
  onProfilePictureChange?: (file: File) => void;
}

export default function ProfileSidebar({
  data,
  onProfilePictureChange,
}: ProfileSidebarProps) {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onProfilePictureChange) {
      onProfilePictureChange(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="bg-white rounded-lg overflow-hidden shadow">
        <div className="bg-burgundy h-20 sm:h-24"></div>
        <div className="px-4 pb-4 flex flex-col items-center -mt-10 sm:-mt-12 relative z-10">
          <div className="relative">
            <img
              src={data.profilePicture || profilePlaceholder}
              alt="Profile"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex-shrink-0 border-4 border-white object-cover"
            />
            {
              <label className="absolute bottom-0 right-0 bg-burgundy text-white p-2 rounded-full cursor-pointer hover:bg-opacity-90 transition">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            }
          </div>
          <h2 className="text-base sm:text-lg font-bold text-center mt-2">
            {data.firstName} {data.lastName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">{data.title}</p>
        </div>

        {/* Contact Info Section */}
        <div className="px-4 py-4 border-t">
          <h3 className="text-xs font-bold text-burgundy uppercase mb-3">
            Contact Info
          </h3>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <Mail size={16} className="flex-shrink-0 text-burgundy" />
              <span className="text-slate-600 truncate">{data.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="flex-shrink-0 text-burgundy" />
              <span className="text-slate-600 truncate">{data.contactNumber}</span>
            </div>
          </div>
        </div>

        {/* Employment Info Section */}
        <div className="px-4 py-4 border-t">
          <h3 className="text-xs font-bold text-burgundy uppercase mb-3">
            Employment Info
          </h3>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <Briefcase size={16} className="flex-shrink-0 text-burgundy" />
              <span className="text-slate-600 truncate">{data.employeeId}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="flex-shrink-0 text-burgundy" />
              <span className="text-slate-600 truncate">
                {data.employmentType}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
