import { User, GraduationCap, Award, BookOpen, Clock } from "lucide-react";

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "personal", label: "Personal Info", Icon: User },
  { id: "education", label: "Education", Icon: GraduationCap },
  { id: "credentials", label: "Credentials", Icon: Award },
  { id: "research", label: "Research", Icon: BookOpen },
  { id: "availability", label: "Availability", Icon: Clock }
];

export default function ProfileTabs({
  activeTab,
  onTabChange,
}: ProfileTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-lg p-2 sm:p-4 shadow-md border border-slate-200">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 min-w-fit px-4 sm:px-6 py-3 sm:py-3 font-semibold flex items-center justify-center gap-2 whitespace-nowrap text-xs sm:text-sm rounded-lg transition-all duration-200 ${
            activeTab === tab.id
              ? "bg-gradient-to-r from-burgundy to-burgundy/90 text-white shadow-md"
              : "text-slate-600 hover:text-charcoal hover:bg-slate-100"
          }`}
        >
          <tab.Icon size={18} className="flex-shrink-0" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
