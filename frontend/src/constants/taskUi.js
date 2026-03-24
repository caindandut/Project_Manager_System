import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  PlayCircle,
} from "lucide-react";

/**
 * GĐ2 mục 2.6 — Hằng số UI cho task (trạng thái, ưu tiên, nhãn, vai trò assignee).
 * Giá trị `value` khớp enum backend (task_status, task_priority, taskassignee_role).
 */

export const TASK_STATUS_OPTIONS = [
  {
    value: "Todo",
    label: "Chưa làm",
    icon: Circle,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  {
    value: "InProgress",
    label: "Đang làm",
    icon: PlayCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    value: "Review",
    label: "Chờ xác nhận",
    icon: Eye,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  {
    value: "Completed",
    label: "Hoàn thành",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  {
    value: "Overdue",
    label: "Quá hạn",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
];

export const TASK_PRIORITY_OPTIONS = [
  { value: "Low", label: "Thấp", color: "text-slate-600", bgColor: "bg-slate-100" },
  { value: "Medium", label: "Trung bình", color: "text-blue-700", bgColor: "bg-blue-100" },
  { value: "High", label: "Cao", color: "text-amber-700", bgColor: "bg-amber-100" },
  { value: "Urgent", label: "Khẩn cấp", color: "text-red-700", bgColor: "bg-red-100" },
];

export const TASK_LABEL_PRESETS = [
  "Backend",
  "Frontend",
  "UI/UX",
  "Design",
  "Database",
  "QA",
  "DevOps",
  "API",
  "Mobile",
  "Testing",
  "Documentation",
];

export const ASSIGNEE_ROLE_OPTIONS = [
  { value: "Main", label: "Chính" },
  { value: "Support", label: "Hỗ trợ" },
];

/**
 * Bảng chuyển trạng thái hợp lệ — đồng bộ backend `ALLOWED_TRANSITIONS`.
 */
export const ALLOWED_TRANSITIONS = {
  Todo: ["InProgress"],
  InProgress: ["Review", "Todo"],
  Review: ["Completed", "InProgress"],
  Completed: [],
  Overdue: ["InProgress", "Review"],
};

/**
 * Trả về danh sách trạng thái tiếp theo mà user được phép chọn.
 * - `canApproveReview = true` khi user là Admin / Director / Manager dự án / người tạo task.
 *   Chỉ những người này mới được duyệt (Review→Completed) hoặc từ chối (Review→InProgress).
 * - Member thường khi task đang Review sẽ nhận mảng rỗng → dropdown bị khoá.
 */
export function getNextStatuses(currentStatus, canApproveReview = false) {
  const transitions = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (currentStatus === "Review" && !canApproveReview) {
    return [];
  }
  return transitions;
}
