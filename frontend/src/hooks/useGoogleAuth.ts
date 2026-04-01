import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import api from "../services/api";

export const useGoogleAuth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.post("/auth/google", {
          code: codeResponse.code,
        });

        const data = res.data as {
          user: { email: string; sub: string; picture: string };
          userInfo: { role: string };
        };

        console.log(data);

        const email = data.user.email;

        if (!email.endsWith("@tup.edu.ph")) {
          setError(
            "Please use your @tup.edu.ph institutional email to sign in.",
          );
          setIsLoading(false);
          return;
        }

        // Store auth data (JWT is handled by httpOnly cookie)
        localStorage.setItem("user_role", data.userInfo.role);
        localStorage.setItem("user_info", JSON.stringify(data.user));

        if (data.userInfo.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/faculty/dashboard");
        }
      } catch (error) {
        setIsLoading(false);
        console.error("Google login error:", error);
        setError(
          error instanceof Error
            ? error.message
            : "An unknown error occurred during Google login.",
        );
      }
    },
    onError: () => {
      setIsLoading(false);
      setError("Google Sign-In was cancelled or failed.");
      console.error("Google Sign-In was cancelled or failed.");
    },
    flow: "auth-code",
  });

  return { loginWithGoogle, error, setError, isLoading };
};
