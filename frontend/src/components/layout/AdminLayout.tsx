import { useState } from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Topbar */}
      <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto pt-16">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
