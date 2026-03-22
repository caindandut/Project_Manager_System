/** Một nguồn preset cho ProjectsPage, ProjectDetailPage, CreateProjectDialog (khớp backend max 100 ký tự label). */
export const MAX_PROJECT_LABEL_LENGTH = 100;

export const DEFAULT_PROJECT_COLOR = "#2563EB";

export const COLOR_PRESETS = [
  "#2563EB",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#4F46E5",
];

export const PROJECT_LABEL_GROUPS = [
  {
    category: "Nền tảng",
    labels: ["Web App", "Mobile App", "Desktop App", "Landing Page", "API Service"],
  },
  {
    category: "Lĩnh vực",
    labels: ["E-commerce", "Giáo dục", "Fintech", "Y tế", "Truyền thông"],
  },
  {
    category: "Tính chất",
    labels: ["Dự án nội bộ", "Khách hàng VIP", "Outsource", "Bảo trì", "R&D"],
  },
];

export const PRIORITY_OPTIONS = [
  { value: "Low", label: "Thấp", className: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "Medium", label: "Trung bình", className: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "High", label: "Cao", className: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "Urgent", label: "Khẩn cấp", className: "bg-red-100 text-red-700 border-red-200" },
];
