/**
 * Lọc task trong nhóm (GĐ2 mục 2.10 — tab Công việc dự án).
 * @typedef {{ status?: string; priority?: string; label?: string; assigneeId?: string; search?: string }} TaskFilters
 */

/** @param {TaskFilters | null | undefined} f */
export function hasActiveTaskFilters(f) {
  if (!f) return false;
  if (f.status || f.priority || f.label || f.assigneeId) return true;
  return !!(f.search && String(f.search).trim());
}

/**
 * @param {unknown[]} groups — taskGroup từ API
 * @param {TaskFilters} filters
 */
export function filterTaskGroups(groups, filters) {
  if (!hasActiveTaskFilters(filters)) {
    return Array.isArray(groups) ? groups : [];
  }
  const q = String(filters.search || "")
    .trim()
    .toLowerCase();
  return (groups || []).map((g) => ({
    ...g,
    tasks: (g.tasks || []).filter((t) => {
      if (filters.status && (t.status || "Todo") !== filters.status) {
        return false;
      }
      if (filters.priority && (t.priority || "Medium") !== filters.priority) {
        return false;
      }
      if (filters.label && (t.label || "") !== filters.label) {
        return false;
      }
      if (filters.assigneeId) {
        const uid = Number(filters.assigneeId);
        if (!t.assignees?.some((a) => a.user_id === uid)) return false;
      }
      if (q && !(t.title || "").toLowerCase().includes(q)) return false;
      return true;
    }),
  }));
}

/** Gom nhãn distinct từ toàn bộ task (kèm preset nếu cần). */
export function collectLabelOptions(groups, presets = []) {
  const set = new Set(presets);
  for (const g of groups || []) {
    for (const t of g.tasks || []) {
      if (t.label && String(t.label).trim()) {
        set.add(String(t.label).trim());
      }
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "vi"));
}

/** Tổng số task (mọi nhóm). */
export function countTasksInGroups(groups) {
  let n = 0;
  for (const g of groups || []) {
    n += (g.tasks || []).length;
  }
  return n;
}
