import { useState } from "react";
import { Send, X, Upload, FileX } from "lucide-react";
import type { Announcement } from "../../types/profile";

interface AnnouncementFormProps {
  onSubmit: (
    announcement: Omit<Announcement, "id" | "createdAt" | "updatedAt">,
    file?: File,
  ) => Promise<void>;
  isLoading?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AnnouncementForm({
  onSubmit,
  isLoading = false,
}: AnnouncementFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(
        `File size must be less than 10MB. Selected file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`,
      );
      return;
    }
    setFile(selectedFile);
    setError("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    try {
      await onSubmit(
        {
          title: title.trim(),
          content: content.trim(),
          createdBy: "Admin",
        },
        file || undefined,
      );

      setTitle("");
      setContent("");
      setFile(null);
      setIsExpanded(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create announcement",
      );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden">
      {/* Collapsed View */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full px-6 py-4 text-left bg-gradient-to-r from-burgundy to-burgundy/90 hover:from-burgundy/90 hover:to-burgundy/80 text-white transition-all duration-200 font-semibold flex items-center gap-3 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all">
            <Send size={20} />
          </div>
          <span className="text-lg">Create New Announcement</span>
        </button>
      )}

      {/* Expanded Form */}
      {isExpanded && (
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 border-t-2 border-slate-200"
        >
          {/* Title Input */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-charcoal mb-2"
            >
              Title <span className="text-burgundy">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-charcoal placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition-all duration-200"
              disabled={isLoading}
            />
          </div>

          {/* Content Textarea */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-semibold text-charcoal mb-2"
            >
              Content <span className="text-burgundy">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter announcement content..."
              rows={6}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-charcoal placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition-all duration-200 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* File Upload */}
          <div className="w-full overflow-hidden">
            <label className="block text-sm font-semibold text-charcoal mb-2">
              Attachment{" "}
              <span className="text-slate-500">(Optional, max 10MB)</span>
            </label>
            {!file ? (
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 block ${
                  isDragging
                    ? "border-burgundy bg-burgundy/10 shadow-lg"
                    : "border-slate-300 hover:border-burgundy/60 bg-gradient-to-br from-slate-50 to-slate-100"
                }`}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-lg bg-burgundy/10 flex items-center justify-center mb-3">
                    <Upload size={24} className="text-burgundy" />
                  </div>
                  <p className="text-sm font-semibold text-charcoal">
                    Drag and drop your file here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Supported: Any file type, max 10MB
                  </p>
                </div>
              </label>
            ) : (
              <div className="bg-gradient-to-r from-burgundy/5 to-burgundy/10 border border-burgundy/20 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-burgundy/20 flex items-center justify-center flex-shrink-0">
                    <FileX size={20} className="text-burgundy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(file.size / 1024 / 1024).toFixed(2)}MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-3 flex-shrink-0 p-2 text-slate-400 hover:text-burgundy hover:bg-burgundy/10 rounded-md transition-all duration-200 cursor-pointer"
                  disabled={isLoading}
                  title="Remove file"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setTitle("");
                setContent("");
                setFile(null);
                setError("");
              }}
              disabled={isLoading}
              className="px-5 py-2.5 text-slate-700 hover:text-charcoal hover:bg-slate-100 rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-burgundy to-burgundy/90 hover:from-burgundy/90 hover:to-burgundy/80 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
            >
              <Send size={20} />
              {isLoading ? "Publishing..." : "Publish Announcement"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
