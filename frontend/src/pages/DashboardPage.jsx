import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const DashboardPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white p-6 rounded shadow border">
        <p className="text-lg">Xin chào, <span className="font-bold text-blue-600">{user?.full_name}</span>!</p>
        <p className="text-slate-500">Email: {user?.email}</p>
        <p className="text-slate-500">Role: {user?.role}</p>

        <Button onClick={logout} variant="destructive" className="mt-4">
          Đăng xuất
        </Button>
      </div>
    </div>
  );
};

export default DashboardPage;