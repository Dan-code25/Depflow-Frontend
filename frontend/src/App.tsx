import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAutoLogin } from "./hooks/useAutoLogin";
import Login from "./pages/auth/Login";
import NotFound from "./pages/NotFound";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminDashboard from "./components/admin/AdminDashboard";
import FacultyDashboard from "./components/faculty/FacultyDashboard";
import MyProfile from "./pages/profile/MyProfile";
import { LoadingSpinner } from "./components/common/LoadingSpinner";

const cliendId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
      </Route>

      <Route element={<ProtectedRoute requiredRole="faculty" />}>
        <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
        <Route path="/faculty/profile" element={<MyProfile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <GoogleOAuthProvider clientId={cliendId}>
        <AppRoutes />
      </GoogleOAuthProvider>
    </BrowserRouter>
  );
}

export default App;
