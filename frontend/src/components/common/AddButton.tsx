interface AddButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

export default function AddButton({
  label,
  onClick,
  className = "",
}: AddButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-2 sm:py-3 border border-dashed border-slate-300 rounded text-burgundy font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm ${className}`}
    >
      <span className="text-base sm:text-lg">+</span> {label}
    </button>
  );
}
