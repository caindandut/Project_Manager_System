import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import authApi from "@/api/authApi";

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(true);

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isPasswordValid = hasMinLength && hasUpperCase && hasSpecialChar;

  useEffect(() => {
    const verifyToken = async () => {
      try {
        await authApi.verifyResetToken(token);
        setTokenValid(true);
      } catch (err) {
        setTokenValid(false);
        setError(err.response?.data?.message || "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      } finally {
        setCheckingToken(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      const errors = [];
      if (!hasMinLength) {
        errors.push("tối thiểu 8 ký tự");
      }
      if (!hasUpperCase) {
        errors.push("chữ in hoa");
      }
      if (!hasSpecialChar) {
        errors.push("ký tự đặc biệt");
      }
      setError("Mật khẩu phải có: " + errors.join(", "));
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setMessage("Đổi mật khẩu thành công!");
    } catch (err) {
      setError(err.response?.data?.message || "Link đã hết hạn hoặc không hợp lệ.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md text-center space-y-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-600">Đang kiểm tra link đặt lại mật khẩu...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid && !message) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md space-y-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Link không hợp lệ</h1>
          <p className="text-slate-600 text-sm">
            {error || "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."}
          </p>
          <Button
            onClick={() => navigate("/forgot-password")}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Yêu cầu link mới
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md space-y-6">
        {message ? (
          <div className="space-y-6 text-center">
            <div className="bg-green-50 text-green-600 p-4 rounded text-center">
              <CheckCircle2 className="h-8 w-8 inline-block mb-2" />
              <h1 className="text-xl font-bold mb-2">Đổi mật khẩu thành công</h1>
              <p className="text-sm">
                Bạn có thể đăng nhập bằng mật khẩu mới của mình.
              </p>
            </div>
            <Button 
              onClick={() => navigate("/login")} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Quay về đăng nhập
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900">Đặt lại mật khẩu</h1>
              <p className="text-slate-500 text-sm mt-2">Nhập mật khẩu mới cho tài khoản của bạn.</p>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center">{error}</div>}
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label>Mật khẩu mới</Label>
              <div className="relative">
                <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                />
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ in hoa và ký tự đặc biệt.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Xác nhận mật khẩu</Label>
              <div className="relative">
                <Input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-2.5 text-slate-400">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Xác nhận đổi mật khẩu"}
            </Button>
          </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;