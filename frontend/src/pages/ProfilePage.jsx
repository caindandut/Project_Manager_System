import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Loader2, AlertCircle } from "lucide-react";
import userApi from "@/api/userApi";

const ROLE_LABELS = { Admin: "Admin", Director: "Director", Employee: "Employee" };

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

export default function ProfilePage() {
  const [tab, setTab] = useState("info");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [fullName, setFullName] = useState("");
  const [avatarPath, setAvatarPath] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    userApi
      .getProfile()
      .then((res) => {
        if (cancelled) return;
        const d = res.data?.data;
        if (d) {
          setProfile(d);
          setFullName(d.full_name ?? "");
          setAvatarPath(d.avatar_path ?? "");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setToast({ message: "Không tải được hồ sơ.", type: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    try {
      const res = await userApi.updateProfile({ fullName: fullName.trim(), avatarPath: avatarPath.trim() || null });
      setProfile((p) => ({ ...p, ...res.data?.data }));
      showToast(res.data?.message || "Đã lưu thay đổi.");
    } catch (err) {
      showToast(err.response?.data?.message || "Cập nhật thất bại.", "error");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("Mật khẩu xác nhận không khớp.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Mật khẩu mới phải có ít nhất 8 ký tự.", "error");
      return;
    }
    setPasswordSubmitting(true);
    try {
      const res = await userApi.changePassword({
        oldPassword,
        newPassword,
      });
      showToast(res.data?.message || "Đổi mật khẩu thành công.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showToast(err.response?.data?.message || "Đổi mật khẩu thất bại.", "error");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const isGoogle = profile?.authProvider === "google";

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
            <CardTitle>Hồ sơ cá nhân</CardTitle>
            <CardDescription>Cập nhật thông tin và bảo mật tài khoản.</CardDescription>
            <div className="flex gap-2 pt-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setTab("info")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === "info"
                    ? "bg-slate-100 text-slate-900 border-b-2 border-blue-600 -mb-px"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Thông tin chung
              </button>
              <button
                type="button"
                onClick={() => setTab("security")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === "security"
                    ? "bg-slate-100 text-slate-900 border-b-2 border-blue-600 -mb-px"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bảo mật
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {tab === "info" && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  {profile?.avatar_path ? (
                    <img
                      src={profile.avatar_path}
                      alt="Avatar"
                      className="h-24 w-24 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="h-12 w-12 text-slate-500" />
                    </div>
                  )}
                  <div className="w-full max-w-xs">
                    <Label htmlFor="avatarPath">URL ảnh đại diện</Label>
                    <Input
                      id="avatarPath"
                      placeholder="https://..."
                      value={avatarPath}
                      onChange={(e) => setAvatarPath(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Họ và tên"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email ?? ""}
                    readOnly
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vai trò</Label>
                  <Badge variant="secondary" className="text-sm">
                    {ROLE_LABELS[profile?.role] ?? profile?.role}
                  </Badge>
                </div>
                <Button type="submit" disabled={profileSubmitting}>
                  {profileSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu thay đổi
                </Button>
              </form>
            )}

            {tab === "security" && (
              <>
                {isGoogle ? (
                  <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">
                      Tài khoản của bạn được liên kết với Google. Bạn không cần sử dụng mật khẩu.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="oldPassword">Mật khẩu hiện tại</Label>
                      <Input
                        id="oldPassword"
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Mật khẩu mới</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ít nhất 8 ký tự"
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={passwordSubmitting}>
                      {passwordSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Đổi mật khẩu
                    </Button>
                  </form>
                )}
              </>
            )}
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
