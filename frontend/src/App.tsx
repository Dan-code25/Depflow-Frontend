import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAutoLogin } from "./hooks/useAutoLogin";
import Login from "./pages/auth/Login";
import NotFound from "./pages/NotFound";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminDashboard from "./components/admin/AdminDashboard";
import FacultyDashboard from "./components/faculty/FacultyDashboard";
import MyProfile from "./pages/profile/MyProfile";
import AdminAnnouncementsPage from "./pages/admin/AdminAnnouncementsPage";
import FacultyAnnouncementsPage from "./pages/faculty/FacultyAnnouncementsPage";
import FacultyInformationPage from "./pages/faculty/FacultyInformationPage";
import { LoadingSpinner } from "./components/common/LoadingSpinner";
import ManageFacultyPage from "./pages/admin/ManageFacultyPage";
import FacultyProfileViewPage from "./pages/admin/FacultyProfileViewPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminManageSchedule from "./pages/admin/AdminManageSchedule";
import MySchedule from "./pages/schedule/MySchedule";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function AppRoutes() {
  const { isCheckingAuth } = useAutoLogin();

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" color="burgundy" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/profile" element={<MyProfile />} />
        <Route
          path="/admin/announcements"
          element={<AdminAnnouncementsPage />}
        />
        <Route path="/admin/manage-faculty" element={<ManageFacultyPage />} />
        <Route path="/admin/faculty/:id" element={<FacultyProfileViewPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="/admin/manage-schedule" element={<AdminManageSchedule />} />
        <Route path="/admin/my-schedule" element={<MySchedule />} />


      </Route>

      <Route element={<ProtectedRoute requiredRole="faculty" />}>
        <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
        <Route path="/faculty/profile" element={<MyProfile />} />
        <Route
          path="/faculty/announcements"
          element={<FacultyAnnouncementsPage />}
        />
        <Route
          path="/faculty/information"
          element={<FacultyInformationPage />}
        />
        <Route
          path="/faculty/faculty/:id"
          element={<FacultyProfileViewPage />}
        />
        <Route path="/faculty/my-schedule" element={<MySchedule />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <GoogleOAuthProvider clientId={clientId}>
        <AppRoutes />
      </GoogleOAuthProvider>
    </BrowserRouter>
  );
}

export default App;
