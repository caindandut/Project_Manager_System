import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import userApi from "@/api/userApi";

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [tokenValid, setTokenValid] = useState(null); // null = đang kiểm tra, true = hợp lệ, false = không hợp lệ
  const [tokenError, setTokenError] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Kiểm tra token ngay khi có token trong URL (link đã dùng / hết hạn → báo luôn, không hiện form)
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenError("Link mời không hợp lệ. Vui lòng kiểm tra lại email hoặc liên hệ quản trị viên.");
      return;
    }
    let cancelled = false;
    setTokenValid(null);
    setTokenError("");
    userApi
      .verifyInviteToken(token)
      .then((res) => {
        if (cancelled) return;
        const { valid, message } = res.data;
        if (valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(message || "Link không hợp lệ hoặc đã hết hạn.");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setTokenValid(false);
        setTokenError("Không thể xác minh link. Link có thể không hợp lệ hoặc đã hết hạn.");
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    setError("");
    setSuccess("");

    if (!fullName.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await userApi.acceptInvite({ token, fullName, password });
      setSuccess(res.data?.message || "Kích hoạt tài khoản thành công.");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      const msg = err.response?.data?.message || "Không thể kích hoạt tài khoản. Link có thể đã hết hạn.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <LockKeyhole className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Hoàn tất thiết lập tài khoản</CardTitle>
          <CardDescription>
            Đặt họ tên và mật khẩu để bắt đầu sử dụng hệ thống.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokenValid === null && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-slate-600">Đang xác minh link mời...</p>
            </div>
          )}
          {tokenValid === false && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-600 text-center">{tokenError}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => navigate("/login")}
              >
                Đi tới trang đăng nhập
              </Button>
            </div>
          )}
          {tokenValid === true && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu mới</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ít nhất 8 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hoàn tất và đăng nhập
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

