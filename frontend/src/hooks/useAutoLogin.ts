// hooks/useAutoLogin.ts
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export const useAutoLogin = () => {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const hasChecked = useRef(false); // Track if we've already verified

  useEffect(() => {
    const checkAuth = async () => {
      if (hasChecked.current) return; // Skip if already checked
      hasChecked.current = true;

      try {
        const res = await api.get("/auth/verify");
        const data = res.data as {
          user: { email: string; sub: string };
          userInfo: { role: string };
        };

        localStorage.setItem("user_role", data.userInfo.role);
        localStorage.setItem("user_info", JSON.stringify(data.user));

        if (data.userInfo.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        } else if (data.userInfo.role === "faculty") {
          navigate("/faculty/dashboard", { replace: true });
        }
      } catch (error) {
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_info");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []); // Empty dependency array - run only on mount

  return { isCheckingAuth };
};
