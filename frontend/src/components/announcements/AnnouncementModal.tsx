import { useState, useEffect } from "react";
import { Send, X, Upload, FileX, Edit, File } from "lucide-react";
import type { Announcement } from "../../types/profile";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    announcement: Omit<Announcement, "id" | "createdAt" | "updatedAt">,
    files?: File[],
  ) => Promise<void>;
  isLoading?: boolean;
  editingAnnouncement?: Announcement | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export function AnnouncementModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  editingAnnouncement = null,
}: AnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen && editingAnnouncement) {
      setTitle(editingAnnouncement.title);
      setContent(editingAnnouncement.content);
      setFiles([]);
    } else if (isOpen) {
      setTitle("");
      setContent("");
      setFiles([]);
    }
  }, [isOpen, editingAnnouncement]);

  const handleFileSelect = (selectedFiles: File[]) => {
    const validFiles: File[] = [];
    let errorMsg = "";

    for (const file of selectedFiles) {
      if (files.length + validFiles.length >= MAX_FILES) {
        errorMsg = `Maximum ${MAX_FILES} files allowed`;
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        errorMsg = `${file.name} exceeds 10MB limit`;
        break;
      }
      validFiles.push(file);
    }

    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    setFiles([...files, ...validFiles]);
    setError("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileSelect(selectedFiles);
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
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelect(droppedFiles);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
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
        files.length > 0 ? files : undefined,
      );

      setTitle("");
      setContent("");
      setFiles([]);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create announcement",
      );
    }
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    setFiles([]);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-burgundy/10 flex items-center justify-center">
              {editingAnnouncement ? (
                <Edit size={20} className="text-burgundy" />
              ) : (
                <Send size={20} className="text-burgundy" />
              )}
            </div>
            <h2 className="text-xl font-bold text-charcoal">
              {editingAnnouncement
                ? "Edit Announcement"
                : "Create New Announcement"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-charcoal hover:bg-slate-100 rounded-lg transition-all duration-200 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
              Attachments{" "}
              <span className="text-slate-500">
                (Optional, max {MAX_FILES} files, 10MB each)
              </span>
            </label>

            {files.length < MAX_FILES && (
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
                  multiple
                />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-lg bg-burgundy/10 flex items-center justify-center mb-3">
                    <Upload size={24} className="text-burgundy" />
                  </div>
                  <p className="text-sm font-semibold text-charcoal">
                    Drag and drop files here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {files.length}/{MAX_FILES} files selected
                  </p>
                </div>
              </label>
            )}

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-burgundy/5 to-burgundy/10 border border-burgundy/20 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-burgundy/20 flex items-center justify-center flex-shrink-0">
                        <File size={18} className="text-burgundy" />
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
                      onClick={() => removeFile(index)}
                      className="ml-3 flex-shrink-0 p-1.5 text-slate-400 hover:text-burgundy hover:bg-burgundy/10 rounded-md transition-all duration-200"
                      disabled={isLoading}
                      title="Remove file"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
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
              onClick={handleClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-slate-700 hover:text-charcoal hover:bg-slate-100 rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-burgundy to-burgundy/90 hover:from-burgundy/90 hover:to-burgundy/80 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Send size={20} />
              {isLoading
                ? "Publishing..."
                : editingAnnouncement
                  ? "Update Announcement"
                  : "Publish Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
