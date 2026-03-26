import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import api from "../services/api";

export const useGoogleAuth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        setError(null);
        const res = await api.post("/auth/google", {
          code: codeResponse.code,
        });

        const data = res.data as {
          user: { email: string; sub: string };
          userInfo: { role: string };
        };

        console.log(data);

        localStorage.setItem("user_role", data.userInfo.role);

        if(data.userInfo.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/faculty/dashboard");
        }
      } catch (error) {
        console.error("Google login error:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred during Google login.");
      }
    },
    onError: () => {
      setError("Google Sign-In was cancelled or failed.");
      console.error("Google Sign-In was cancelled or failed.");
    },
    flow: "auth-code",
  });

  return { loginWithGoogle, error, setError };
};
