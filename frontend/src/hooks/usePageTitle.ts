import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const usePageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    // Map routes to page titles
    const routeTitleMap: Record<string, string> = {
      "/": "DeptFlow | Login",
      "/admin/dashboard": "DeptFlow | Dashboard",
      "/admin/profile": "DeptFlow | My Profile",
      "/admin/announcements": "DeptFlow | Announcements",
      "/admin/manage-faculty": "DeptFlow | Manage Faculty",
      "/admin/analytics": "DeptFlow | Analytics",
      "/admin/manage-schedule": "DeptFlow | Manage Schedule",
      "/admin/my-schedule": "DeptFlow | My Schedule",
      "/faculty/dashboard": "DeptFlow | Dashboard",
      "/faculty/profile": "DeptFlow | My Profile",
      "/faculty/announcements": "DeptFlow | Announcements",
      "/faculty/information": "DeptFlow | Faculty Information",
      "/faculty/my-schedule": "DeptFlow | My Schedule",
    };

    // Check for exact match first
    let pageTitle = routeTitleMap[location.pathname];

    // If not found, check for dynamic routes (with parameters like :id)
    if (!pageTitle) {
      if (location.pathname.includes("/admin/faculty/")) {
        pageTitle = "DeptFlow | Faculty Profile";
      } else if (location.pathname.includes("/faculty/faculty/")) {
        pageTitle = "DeptFlow | Faculty Profile";
      } else {
        pageTitle = "DeptFlow"; // Default title
      }
    }

    // Update the document title
    document.title = pageTitle;
  }, [location.pathname]);
};
