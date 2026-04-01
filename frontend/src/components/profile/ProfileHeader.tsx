import { User } from "lucide-react";

export default function ProfileHeader() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <User size={28} className="text-burgundy" />
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">My Profile</h1>
      </div>
      <p className="text-slate-600 text-sm sm:text-base ml-11">
        View and manage your personal information
      </p>
    </div>
  );
}
