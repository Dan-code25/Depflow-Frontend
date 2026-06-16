import { CheckCircle2, Sparkles, X } from "lucide-react";

interface AIAdvisorModalProps {
  isLoading: boolean;
  cachedAdvice: any[] | null;
  onClose: () => void;
  onRecalculate: () => void;
}

export function AIAdvisorModal({
  isLoading,
  cachedAdvice,
  onClose,
  onRecalculate,
}: AIAdvisorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl font-lexend">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-violet-50">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-600" />
            <h3 className="text-base font-bold text-violet-900">
              AI Faculty Load Advisor
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-violet-100/50 flex items-center justify-center text-violet-600 hover:bg-violet-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-grow bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4" />
              <p className="text-sm font-semibold text-violet-600">
                Analyzing faculty workloads...
              </p>
            </div>
          ) : cachedAdvice && cachedAdvice.length > 0 ? (
            <div className="space-y-3">
              {cachedAdvice.map((advice, index) => (
                <div
                  key={index}
                  className="p-4 bg-violet-50/50 border border-violet-100 rounded-xl"
                >
                  <p className="text-sm font-bold text-violet-900 mb-1.5">
                    {advice.summaryNote}
                  </p>
                  <p className="text-xs text-violet-800 leading-relaxed">
                    {advice.suggestion}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 gap-3 bg-green-50 border border-green-100 rounded-xl">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle2 size={24} />
              </div>
              <div className="text-center">
                <p className="font-bold text-green-900 text-base">Load is Balanced!</p>
                <p className="text-sm text-green-700 mt-1">
                  No cross-specialization transfers required at this time.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between bg-gray-50 items-center">
          <button
            onClick={onRecalculate}
            disabled={isLoading}
            className="text-xs text-violet-600 hover:text-violet-800 font-bold disabled:opacity-50 flex items-center gap-1"
          >
            🔄 Recalculate Advice
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}