import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import api from "../services/api";

const getFriendlyLoginError = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return "We couldn't sign you in right now. Please try again.";
  }

  if (!error.response) {
    return "Cannot reach the server. Please check your internet connection and try again.";
  }

  const status = error.response.status;
  const serverMessage =
    typeof error.response.data === "object" && error.response.data !== null
      ? (error.response.data as { message?: string }).message
      : undefined;

  if (status === 400) {
    return (
      serverMessage ||
      "Sign-in request was invalid. Please try again from the login page."
    );
  }

  if (status === 401 || status === 403) {
    return (
      serverMessage ||
      "This Google account is not allowed to access this system. Please use your @tup.edu.ph account."
    );
  }

  if (status >= 500) {
    return "The server is temporarily unavailable. Please try again in a few moments.";
  }

  return serverMessage || "Sign-in failed. Please try again.";
};

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

        const email = data.user.email;

        if (!email.endsWith("@tup.edu.ph")) {
          setError(
            "Please use your institutional @tup.edu.ph email to sign in.",
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
        setError(getFriendlyLoginError(error));
      }
    },
    onError: () => {
      setIsLoading(false);
      setError(
        "Google sign-in was cancelled or could not be completed. Please try again.",
      );
      console.error("Google Sign-In was cancelled or failed.");
    },
    flow: "auth-code",
    select_account: true,
  });

  return { loginWithGoogle, error, setError, isLoading };
};
