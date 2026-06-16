export function ConflictBadge({ type }: { type: "HARD" | "SOFT" }) {
  return type === "HARD" ? (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
      🔴 Hard
    </span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
      🟡 Soft
    </span>
  );
}