import { useState } from "react";
import { Modal } from "../common/Modal";

interface SetupSectionsModalProps {
  onClose: () => void;
  activeSem: { schoolYear: string; sem: 1 | 2 };
  onSave: (counts: Record<string, Record<number, number>>) => Promise<void>;
}

export function SetupSectionsModal({
  onClose,
  activeSem,
  onSave,
}: SetupSectionsModalProps) {
  const programs = ["BSCS", "BSIT", "BSIS"];
  const years = [1, 2, 3, 4];

  const [counts, setCounts] = useState<Record<string, Record<number, number>>>(
    () => {
      const init: any = {};
      programs.forEach((p) => {
        init[p] = { 1: 0, 2: 0, 3: 0, 4: 0 };
      });
      return init;
    },
  );
  const [saving, setSaving] = useState(false);

  const updateCount = (prog: string, year: number, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setCounts((prev) => ({ ...prev, [prog]: { ...prev[prog], [year]: num } }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(counts);
    setSaving(false);
  };

  const totalSections = programs.reduce(
    (total, prog) =>
      total + years.reduce((sum, yr) => sum + counts[prog][yr], 0),
    0,
  );

  return (
    <Modal
      title={`Setup Sections (${activeSem.schoolYear})`}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <p className="text-sm text-gray-600 mb-4">
        Define how many sections exist for each program and year level. The system
        will automatically generate the section names (e.g., 1-A, 1-B) and link
        their required subjects.
      </p>

      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Program</th>
              {years.map((y) => (
                <th key={y} className="px-4 py-3 font-semibold text-center">
                  {y}
                  {y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {programs.map((prog) => (
              <tr key={prog}>
                <td className="px-4 py-3 font-bold text-gray-800">{prog}</td>
                {years.map((y) => (
                  <td key={y} className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={counts[prog][y] || ""}
                      onChange={(e) => updateCount(prog, y, e.target.value)}
                      className="w-16 px-2 py-1.5 text-center border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      placeholder="0"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          Total Sections to Generate:{" "}
          <span className="font-bold text-indigo-600 text-lg">{totalSections}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || totalSections === 0}
            className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition-colors cursor-pointer ${
              saving || totalSections === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {saving ? "Saving..." : "Generate Sections"}
          </button>
        </div>
      </div>
    </Modal>
  );
}