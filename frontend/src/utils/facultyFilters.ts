export function getFilterButtonClass(isSelected: boolean): string {
  return `px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
    isSelected
      ? "bg-burgundy text-white shadow-sm"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
  }`;
}

export function getEmploymentSelectClass(): string {
  return "px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-burgundy focus:border-transparent transition-all";
}

export function getFilterLabelClass(): string {
  return "text-sm font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2";
}
