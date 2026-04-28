export const getLoadColor = (current: number, max: number) => {
  const pct = (current / max) * 100;
  if (pct >= 100) return "bg-red-500";
  if (pct >= 80) return "bg-amber-400";
  return "bg-green-500";
};

export const getLoadWidth = (current: number, max: number) =>
  `${Math.min((current / max) * 100, 100)}%`;
