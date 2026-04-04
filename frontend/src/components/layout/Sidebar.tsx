import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Home,
  Users,
  Calendar,
  Megaphone,
  BarChart3,
  User,
  LogOut,
} from "lucide-react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { useLogout } from "../../hooks/useLogout";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const logoutUser = useLogout();

  const navItems = [
    { label: "Dashboard", icon: Home, path: "/admin/dashboard" },
    { label: "Manage Faculty", icon: Users, path: "/admin/manage-faculty" },
    { label: "Manage Schedule", icon: Calendar, path: "/admin/schedule" },
    { label: "Announcements", icon: Megaphone, path: "/admin/announcements" },
    { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
    { label: "My Profile", icon: User, path: "/admin/profile" },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setSidebarOpen(false); // Auto-close on mobile
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setIsLoggingOut(true);
    logoutUser.logout();
  };

  return (
    <>
      {/* Backdrop (Mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative left-0 top-16 w-64 h-[calc(100vh-64px)] bg-slate-50 border-r border-slate-200 z-30 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Navigation Header */}
        <div className="px-4 py-6">
          <h3 className="text-slate-500 text-xs uppercase font-semibold">
            Main Navigation
          </h3>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`relative w-full flex items-center gap-3 px-3 py-3 rounded-md transition-colors cursor-pointer font-medium ${
                  isActive
                    ? "bg-active text-burgundy font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-[3.5px] bg-burgundy rounded-l-full" />
                )}
                <Icon size={20} />
                <span className="text-sm ">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="border-t border-slate-200 mx-3 my-4" />

        {/* Log Out Button */}
        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 cursor-pointer font-medium text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-md transition-colors"
          >
            <LogOut size={18} />
            <span className="text-slate-600">Log Out</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Log Out"
        message="Are you sure you want to log out? You'll need to sign in again to access your account."
        confirmText="Log Out"
        cancelText="Cancel"
        isLoading={isLoggingOut}
        isDangerous={true}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
