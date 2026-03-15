import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import companyApi from "@/api/companyApi";

function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div
        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        }`}
      >
        {message}
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
          &times;
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    size: "",
  });

  useEffect(() => {
    let cancelled = false;
    companyApi
      .get()
      .then((res) => {
        if (cancelled) return;
        const d = res.data?.data;
        if (d) {
          setForm({
            name: d.name ?? "",
            industry: d.industry ?? "",
            size: d.size ?? "",
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setToast({ message: "Không tải được thông tin công ty.", type: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await companyApi.update({
        name: form.name.trim(),
        industry: form.industry.trim() || undefined,
        size: form.size.trim() || undefined,
      });
      showToast(res.data?.message || "Đã lưu cài đặt công ty.");
    } catch (err) {
      showToast(err.response?.data?.message || "Cập nhật thất bại.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Cài đặt công ty</CardTitle>
            <CardDescription>Quản lý thông tin công ty của bạn.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên công ty</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Tên công ty"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Lĩnh vực hoạt động</Label>
                <Input
                  id="industry"
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="Ví dụ: Công nghệ, Giáo dục"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Quy mô nhân sự</Label>
                <Input
                  id="size"
                  value={form.size}
                  onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                  placeholder="Ví dụ: 1-50, 51-200"
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu thay đổi
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </DashboardLayout>
  );
}
