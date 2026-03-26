import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  requiredRole: "admin" | "faculty";
}

export function ProtectedRoute({
  requiredRole,
}: ProtectedRouteProps) {
  const userRole = localStorage.getItem("user_role");
  console.log(userRole);

  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  if (userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
