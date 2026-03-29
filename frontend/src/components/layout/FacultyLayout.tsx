import { useState } from "react";
import { Topbar } from "./Topbar";
import { FacultySidebar } from "./FacultySidebar";

interface FacultyLayoutProps {
  children: React.ReactNode;
}

export function FacultyLayout({ children }: FacultyLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Topbar */}
      <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <FacultySidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto pt-16">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
