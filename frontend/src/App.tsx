import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login";
import NotFound from "./pages/NotFound";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminDashboard from "./components/admin/AdminDashboard";
import FacultyDashboard from "./components/faculty/FacultyDashboard";


const cliendId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
  return (
    <BrowserRouter>
      <GoogleOAuthProvider clientId={cliendId}>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
          
          <Route element={<ProtectedRoute requiredRole="faculty" />}>
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </GoogleOAuthProvider>
    </BrowserRouter>
  );
}


export default App;
