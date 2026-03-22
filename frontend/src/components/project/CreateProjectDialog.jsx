import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import projectApi from "@/api/projectApi";
import LabelChipSelector from "@/components/project/LabelChipSelector";
import {
  COLOR_PRESETS,
  DEFAULT_PROJECT_COLOR,
  PRIORITY_OPTIONS,
} from "@/constants/projectUi";

function buildInitialForm() {
  return {
    project_name: "",
    description: "",
    start_date: "",
    end_date: "",
    color_code: DEFAULT_PROJECT_COLOR,
    label: "",
    priority: "Medium",
  };
}

/**
 * @param {{ open: boolean; onOpenChange: (v: boolean) => void; onSuccess: (msg?: string) => void }} props
 */
export default function CreateProjectDialog({ open, onOpenChange, onSuccess }) {
  const [form, setForm] = useState(buildInitialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chipHint, setChipHint] = useState("");

  const reset = () => {
    setForm(buildInitialForm());
    setError("");
    setChipHint("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setChipHint("");
    if (!form.project_name.trim()) {
      setError("Vui lòng nhập tên dự án");
      return;
    }
    if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date)) {
      setError("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.start_date) delete payload.start_date;
      if (!payload.end_date) delete payload.end_date;
      if (!payload.label) delete payload.label;
      await projectApi.create(payload);
      reset();
      onOpenChange(false);
      onSuccess("Tạo dự án thành công");
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo dự án mới</DialogTitle>
          <DialogDescription>
            Điền thông tin dự án để bắt đầu quản lý công việc.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {chipHint && (
            <p className="text-xs text-amber-600">{chipHint}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="pname">Tên dự án *</Label>
            <Input
              id="pname"
              placeholder="VD: Website Redesign"
              value={form.project_name}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdesc">Mô tả</Label>
            <textarea
              id="pdesc"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Mô tả ngắn về dự án..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sdate">Ngày bắt đầu</Label>
              <Input
                id="sdate"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edate">Ngày kết thúc</Label>
              <Input
                id="edate"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Màu nhận diện</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color_code: c })}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      form.color_code === c ? "border-slate-900 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Độ ưu tiên</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nhãn phân loại dự án</Label>
            <p className="text-xs text-slate-400">Chọn nhãn mô tả tính chất vĩ mô của dự án</p>
            <LabelChipSelector
              value={form.label}
              onChange={(v) => setForm({ ...form, label: v })}
              onLimitWarning={setChipHint}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo dự án
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
