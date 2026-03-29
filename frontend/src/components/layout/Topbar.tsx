import { Menu } from "lucide-react";
import logo from "../../assets/logo-white.svg";

interface TopbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Topbar({ sidebarOpen, setSidebarOpen }: TopbarProps) {
  const userInfo = localStorage.getItem("user_info");
  const userRole = localStorage.getItem("user_role");

  let email = "user@tup.edu.ph";
  let profilePicUrl = "";
  if (userInfo) {
    try {
      const parsed = JSON.parse(userInfo);
      email = parsed.email || email;
      profilePicUrl = parsed.picture || "";
    } catch {
      // Keep default email
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-burgundy z-40 shadow-md flex items-center justify-between px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Hamburger Menu (Mobile only) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex lg:hidden text-white cursor-pointer"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>

        {/* Logo */}
        <img
          src={logo}
          alt="DeptFlow Logo"
          className="h-9 sm:h-10 md:h-11 lg:h-13"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Info Section */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:block border-r-2 border-[#941616] h-8" />
        <div className="text-right">
          <span className="text-white text-xs sm:text-sm">{email}</span>
          <div className="text-white px-3 py-1 text-[10px] font-bold sm:text-xs">
            {userRole?.toUpperCase() || "USER"}
          </div>
        </div>

        {/* Profile Picture Circle */}
        {profilePicUrl ? (
          <img
            src={profilePicUrl}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 bg-white rounded-full flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
