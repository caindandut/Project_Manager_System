import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = "Đăng nhập";
  }, []);

  return (
    <div className="w-full h-screen flex justify-center items-center bg-white">
      <div className="w-full flex flex-col justify-center items-center px-8 md:px-16 lg:px-24">
        <div className="w-full max-w-md space-y-8">
        
          <div className="flex flex-col space-y-2">
            <div className="flex justify-center mb-4">
              <img 
                src="https://share-gcdn.basecdn.net/brand/logo.full.png" 
                alt="Logo" 
                className="h-12 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 text-center">
              Đăng nhập
            </h1>
            <p className="text-slate-500 text-center">
            Chào mừng trở lại. Đăng nhập để bắt đầu làm việc.
            </p>
          </div>

          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-base">
              Đăng nhập
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Hoặc</span>
            </div>
          </div>

          <Button variant="outline" className="w-full h-11 gap-2 text-slate-700 font-medium">
            <img 
                src="https://www.svgrepo.com/show/475656/google-color.svg" 
                alt="Google" 
                className="w-5 h-5" 
            />
            Đăng nhập bằng Google
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;