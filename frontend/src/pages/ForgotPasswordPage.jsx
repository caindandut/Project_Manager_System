import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, LayoutGrid, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import authApi from "@/api/authApi";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setIsSuccess(true);
    } catch (error) {
      setError(error.response?.data?.message || "Có xảy ra lỗi. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    document.title = "Khôi phục mật khẩu";
  }, []);

  return (
    <div className="w-full h-screen flex justify-center items-center bg-white">
      <div className="w-full flex flex-col justify-center items-center px-8 md:px-16 lg:px-24">
        <div className="w-full max-w-md space-y-8">
           <div className="flex justify-center mb-4">
              <img 
                src="https://share-gcdn.basecdn.net/brand/logo.full.png" 
                alt="Logo" 
                className="h-12 w-auto"
              />
            </div>

          {isSuccess ? (
            <div className="space-y-6 text-center">
              <div className="bg-green-50 text-green-600 p-3 rounded text-sm text-center">
                <CheckCircle2 className="h-5 w-5 inline-block mr-2" />
                Email đã được gửi thành công! Vui lòng kiểm tra email của bạn.
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Kiểm tra email của bạn</h2>
              <p className="text-slate-500">
                Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong>{email}</strong>.
                Vui lòng kiểm tra cả hộp thư rác (spam).
              </p>
              <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 mt-4" onClick={() => setIsSuccess(false)}>
                Gửi lại email
              </Button>
            </div>
          ) : (
            <>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 text-center">
                Khôi phục mật khẩu
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed text-center">
                Hãy nhập thông tin của bạn. Hướng dẫn khôi phục mật khẩu sẽ được gửi đến email của bạn.
              </p>
            </div>
            </>
          )}

          {!isSuccess && (
            <>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center">
                  <AlertCircle className="h-5 w-5 inline-block mr-2" />
                  {error}
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    className="h-11 bg-slate-50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Đang xử lý...
                    </>
                  ) : "Khôi phục mật khẩu"}
                </Button>
              </form>
            </>
          )}

          <div className="flex justify-center">
            <Link 
              to="/login" 
              className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 gap-2"
            >
              <ArrowLeft size={16} />
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;