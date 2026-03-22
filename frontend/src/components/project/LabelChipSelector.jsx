import { PROJECT_LABEL_GROUPS, MAX_PROJECT_LABEL_LENGTH } from "@/constants/projectUi";

/**
 * @param {string} value - chuỗi CSV nhãn đã chọn
 * @param {(next: string) => void} onChange
 * @param {(msg: string) => void} [onLimitWarning] - gọi khi thêm nhãn vượt MAX_PROJECT_LABEL_LENGTH
 */
export default function LabelChipSelector({ value, onChange, onLimitWarning }) {
  const selected = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const toggle = (label) => {
    const next = selected.includes(label)
      ? selected.filter((l) => l !== label)
      : [...selected, label];
    const csv = next.join(", ");
    if (csv.length > MAX_PROJECT_LABEL_LENGTH) {
      onLimitWarning?.(`Tối đa ${MAX_PROJECT_LABEL_LENGTH} ký tự cho nhãn (đã đủ hoặc quá dài).`);
      return;
    }
    onChange(csv);
  };

  return (
    <div className="space-y-3">
      {PROJECT_LABEL_GROUPS.map((group) => (
        <div key={group.category}>
          <p className="mb-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
            {group.category}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.labels.map((lbl) => {
              const isActive = selected.includes(lbl);
              return (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => toggle(lbl)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {isActive && <span className="mr-1">✓</span>}
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
