import { Mail, Phone, Briefcase, Calendar, Trash2 } from "lucide-react";
import type { Faculty } from "../../types/faculty";
import profilePlaceholder from "../../assets/profile-placeholder.svg";

interface FacultyCardProps {
  faculty: Faculty;
  onViewProfile: (faculty: Faculty) => void;
  onDeleteClick?: (faculty: Faculty) => void;
  isAdmin?: boolean;
}

export function FacultyCard({
  faculty,
  onViewProfile,
  onDeleteClick,
  isAdmin = false,
}: FacultyCardProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
      {/* Burgundy Gradient Header */}
      <div className="bg-gradient-to-r from-burgundy to-burgundy/90 h-24 sm:h-28"></div>

      {/* Profile Section */}
      <div className="px-4 pb-6 flex flex-col items-center -mt-12 sm:-mt-14 relative z-10">
        <img
          src={faculty.profilePicture || profilePlaceholder}
          alt={`${faculty.firstName} ${faculty.lastName}`}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex-shrink-0 border-4 border-white object-cover shadow-lg"
        />
        <h2 className="text-lg sm:text-xl font-bold text-center mt-4 text-charcoal">
          {faculty.firstName} {faculty.lastName}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 font-medium mt-1">
          {faculty.designation}
        </p>
      </div>

      {/* Contact Info Section */}
      <div className="px-5 py-4 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <h3 className="text-xs font-bold text-burgundy uppercase mb-3 tracking-wide">
          Contact
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0">
              <Mail size={16} className="text-burgundy" />
            </div>
            <a
              href={`mailto:${faculty.email}`}
              className="text-sm text-slate-700 truncate font-medium hover:text-burgundy transition-colors"
            >
              {faculty.email}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0">
              <Phone size={16} className="text-burgundy" />
            </div>
            <a
              href={`tel:${faculty.contactNumber}`}
              className="text-sm text-slate-700 truncate font-medium hover:text-burgundy transition-colors"
            >
              {faculty.contactNumber}
            </a>
          </div>
        </div>
      </div>

      {/* Employment Info Section */}
      <div className="px-5 py-4 border-t border-slate-200">
        <h3 className="text-xs font-bold text-burgundy uppercase mb-3 tracking-wide">
          Employment
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0">
              <Briefcase size={16} className="text-burgundy" />
            </div>
            <span className="text-sm text-slate-700 truncate font-medium">
              {faculty.employeeId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-burgundy/10 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-burgundy" />
            </div>
            <span className="text-sm text-slate-700 truncate font-medium">
              {faculty.employmentType}
            </span>
          </div>
        </div>
      </div>

      {/* Core Group Info */}
      <div className="px-5 py-4 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <h3 className="text-xs font-bold text-burgundy uppercase mb-3 tracking-wide">
          Core Group
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-burgundy"></div>
          <span className="text-sm text-slate-700 font-medium">
            {faculty.coreGroup}
          </span>
        </div>
      </div>

      {/* View Profile & Delete Buttons */}
      <div className="px-5 py-4 border-t border-slate-200 space-y-2">
        <button
          onClick={() => onViewProfile(faculty)}
          className="w-full px-3 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-burgundy to-burgundy/90 hover:from-burgundy/90 hover:to-burgundy/80 rounded-lg transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md cursor-pointer"
        >
          View Profile
        </button>
        {isAdmin && onDeleteClick && (
          <button
            onClick={() => onDeleteClick(faculty)}
            className="w-full px-3 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all duration-200 active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 size={16} />
            Delete Faculty
          </button>
        )}
      </div>
    </div>
  );
}
