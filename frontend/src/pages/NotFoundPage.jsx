import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="w-full h-screen flex justify-center items-center bg-white">
      <div className="w-full flex flex-col justify-center items-center px-8 md:px-16 lg:px-24">
        <div className="w-full max-w-md space-y-8 text-center">

          <div className="flex justify-center mb-4">
            <img
              src="https://share-gcdn.basecdn.net/brand/logo.full.png"
              alt="Logo"
              className="h-12 w-auto"
            />
          </div>

          <div className="space-y-4">
            <h1 className="text-9xl font-bold text-slate-900 leading-none text-center">
              404
            </h1>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 leading-none">Không tìm thấy trang</h2>
              <p className="text-slate-500 text-base leading-relaxed text-center">
              Rất tiếc! Trang bạn đang cố truy cập không tồn tại.
              </p>
            </div>
          </div>

          <div className="flex justify-center items-center pt-4">
            <Button 
              asChild
              className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-700"
            >
              <Link to="/login">
                <Home size={18} className="mr-2" />
                Về trang chủ
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
