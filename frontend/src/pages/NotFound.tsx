import { FileX, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 to-slate-100 px-5">
      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-4xl">
        {/* Icon Section */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-burgundy/10 rounded-full blur-3xl w-48 h-48 lg:w-64 lg:h-64 -z-10"></div>
          <FileX size={200} className="text-burgundy lg:size-80" strokeWidth={0.8} />
        </div>

        {/* Text Content */}
        <div className="text-center lg:text-left">
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-extrabold text-burgundy leading-none mb-2">
            404
          </h1>

          <h2 className="text-charcoal text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Page not found!
          </h2>

          <p className="text-slate-600 text-base sm:text-lg mb-8 max-w-md lg:max-w-none leading-relaxed">
            Sorry, the page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          {/* Button */}
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center gap-2 bg-burgundy text-white font-bold border-2 border-burgundy rounded-[24px] py-4 px-10 sm:px-14 cursor-pointer transition-all duration-200 hover:bg-white hover:text-burgundy hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Home size={22} />
            <span>Go Back Home</span>
          </button>

        </div>
      </div>
    </div>
  );
}
