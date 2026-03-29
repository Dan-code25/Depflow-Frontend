import { Info } from "lucide-react";

import school from "../../assets/school-tup.webp";
import tupLogo from "../../assets/tup-logo.svg";
import appLogo from "../../assets/logo.png";
import google from "../../assets/google.png";

import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";

export default function Login() {

  const { loginWithGoogle, error, setError, isLoading } = useGoogleAuth();
  
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Left Panel */}
      <div className="relative lg:flex-1 h-[40vh] sm:h-[50vh] lg:h-screen">
        <img
          src={school}
          alt="school"
          className="w-full h-full object-cover absolute inset-0 blur-[3px]"
        />
        <div className="absolute inset-0 bg-maroon/85 p-5 sm:p-10 lg:p-14 flex flex-col">
          {/* Logo */}
          <div className="flex w-full justify-center">
            <img
              src={tupLogo}
              alt="tup-logo"
              className="w-[60px] sm:w-[90px] lg:w-[140px] hover:scale-110 transition-transform duration-300"
            />
          </div>

          {/* Text content */}
          <div className="flex flex-col flex-1 justify-center gap-2 sm:gap-5 lg:gap-5 mt-2 lg:-mt-20">
            <h2 className="text-white font-bold text-center text-[22px] sm:text-3xl lg:text-5xl leading-snug">
              Computer Studies Department
            </h2>
            <h2 className="font-bold text-gold text-center text-[22px] sm:text-3xl lg:text-5xl leading-snug">
              Faculty Management System
            </h2>
            <p className="text-center font-light text-white text-[11px] sm:text-sm lg:text-base w-full px-1 sm:px-6 lg:px-0 leading-relaxed">
              The Technological University of the Philippines - Manila Computer
              Studies Department{" "}
              <span className="hidden sm:inline">
                <br />
              </span>{" "}
              Faculty Management System with AI assisted Scheduling
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-5 sm:px-10 py-7 sm:py-12 lg:py-0 gap-0 bg-gradient-to-br from-white to-slate-50">
        {/* Content Container */}
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="text-center mb-8 lg:mb-10">
            <img
              src={appLogo}
              alt="app logo"
              className="w-32 sm:w-40 lg:w-48 mx-auto mb-4 lg:mb-6 hover:scale-105 transition-transform duration-300"
            />
            <h2 className="font-semibold text-charcoal text-sm sm:text-base lg:text-lg text-center">
              Faculty Management System with AI assisted Scheduling
            </h2>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mb-8 lg:mb-10"></div>

          {/* Sign In Section */}
          <div className="space-y-4">
            <button
              onClick={() => loginWithGoogle()}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 sm:gap-4 bg-burgundy text-white font-semibold border-2 border-burgundy rounded-[24px] py-4 sm:py-5 px-6 sm:px-8 cursor-pointer text-sm sm:text-base transition-all duration-200 hover:bg-white hover:text-burgundy hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <>
                  <img src={google} alt="google" className="w-5 sm:w-6" />
                  <span>Continue with TUP email</span>
                </>
              )}
            </button>

            {error && (
              <div className="flex gap-3 w-full py-3 px-4 bg-red-50 border border-red-300 rounded-[16px] animate-in fade-in">
                <p className="text-xs sm:text-sm text-red-700 leading-relaxed flex-1">
                  {error}
                </p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 font-semibold text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-8 lg:mt-10">
            <div className="flex gap-3 w-full py-4 px-4 bg-slate-50 border border-slate-200 rounded-[20px] shadow-sm hover:shadow-md transition-shadow duration-200">
              <Info
                size={20}
                className="shrink-0 mt-0.5 text-burgundy sm:size-[22px]"
              />
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Use your institutional{" "}
                <span className="text-burgundy font-semibold">@tup.edu.ph</span>{" "}
                account to sign in. Access is restricted to authorized faculty
                only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
