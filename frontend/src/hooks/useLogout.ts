import { useNavigate } from "react-router-dom";
import api from "../services/api";

export const useLogout = () => {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_info");
      navigate("/");
    }
  };

  return { logout };
};
