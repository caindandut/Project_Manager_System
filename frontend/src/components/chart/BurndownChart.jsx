import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import reportApi from "@/api/reportApi";
import { Loader2, AlertCircle, TrendingDown } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatDateLabel(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function BurndownTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const ideal = payload.find((p) => p.dataKey === "idealRemaining")?.value ?? 0;
  const actual = payload.find((p) => p.dataKey === "actualRemaining")?.value ?? 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-800">Ngày {formatDateLabel(label)}</p>
      <p className="text-slate-600">Lý tưởng: {ideal}</p>
      <p className="text-slate-600">Thực tế: {actual}</p>
    </div>
  );
}

export default function BurndownChart({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await reportApi.getProjectBurndown(projectId);
        if (cancelled) return;
        setChartData(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Không thể tải dữ liệu burndown");
          setChartData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const normalizedData = useMemo(
    () =>
      chartData.map((item) => ({
        date: item.date,
        idealRemaining: Number(item.idealRemaining ?? 0),
        actualRemaining: Number(item.actualRemaining ?? 0),
      })),
    [chartData],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="h-5 w-5 text-blue-600" />
          Burndown Chart
        </CardTitle>
        <CardDescription>
          Theo dõi task còn lại: đường lý tưởng so với thực tế theo từng ngày
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải dữ liệu burndown...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : normalizedData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Chưa có dữ liệu để hiển thị burndown.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={normalizedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDateLabel} minTickGap={24} />
              <YAxis allowDecimals={false} />
              <Tooltip content={<BurndownTooltip />} />
              <Line
                type="monotone"
                dataKey="idealRemaining"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                name="Lý tưởng"
              />
              <Line
                type="monotone"
                dataKey="actualRemaining"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                name="Thực tế"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
