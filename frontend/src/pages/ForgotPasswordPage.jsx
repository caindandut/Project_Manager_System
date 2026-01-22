import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";

const ForgotPasswordPage = () => {
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

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 text-center">
              Khôi phục mật khẩu
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed text-center">
              Hãy nhập thông tin của bạn. Hướng dẫn khôi phục mật khẩu sẽ được gửi đến email của bạn.
            </p>
          </div>

          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                className="h-11 bg-slate-50"
              />
            </div>

            <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700">
              Khôi phục mật khẩu
            </Button>
          </form>

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