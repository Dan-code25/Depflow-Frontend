import { User, GraduationCap, Award, BookOpen } from "lucide-react";

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "personal", label: "Personal Info", Icon: User },
  { id: "education", label: "Education", Icon: GraduationCap },
  { id: "credentials", label: "Credentials", Icon: Award },
  { id: "research", label: "Research", Icon: BookOpen },
];

export default function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-lg p-2 sm:p-3">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 min-w-fit px-4 sm:px-6 py-2 sm:py-3 font-medium flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-sm rounded-lg transition-all ${
            activeTab === tab.id
              ? "bg-red-100 text-burgundy"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <tab.Icon size={16} className="flex-shrink-0" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}