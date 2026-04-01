import { useState } from "react";
import { Search, X } from "lucide-react";

interface AnnouncementSearchProps {
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export function AnnouncementSearch({
  onSearchChange,
  placeholder = "Search announcements by title or content...",
}: AnnouncementSearchProps) {
  const [query, setQuery] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearchChange(value);
  };

  const handleClear = () => {
    setQuery("");
    onSearchChange("");
  };

  return (
    <div className="relative w-full">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-burgundy pointer-events-none">
        <Search size={20} />
      </div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-12 pr-12 py-3.5 border border-slate-300 hover:border-burgundy/40 rounded-lg text-charcoal placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-burgundy transition-all duration-200 font-medium bg-white shadow-sm hover:shadow-md focus:shadow-md"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-burgundy transition-colors"
          aria-label="Clear search"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}
