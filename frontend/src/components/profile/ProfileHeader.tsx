import { User } from "lucide-react";

interface ProfileHeaderProps {
  name?: string;
  description?: string;
}

export default function ProfileHeader({
  name = "My Profile",
  description = "View and manage your personal information",
}: ProfileHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <User size={28} className="text-burgundy" />
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">{name}</h1>
      </div>
      <p className="text-slate-600 text-sm sm:text-base ml-11">{description}</p>
    </div>
  );
}
