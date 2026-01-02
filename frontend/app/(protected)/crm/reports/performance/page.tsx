"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ActivitySummary {
  total: number;
  completed: number;
  pending: number;
  completion_rate: number;
  by_type: {
    type: string;
    total: number;
    completed: number;
    completion_rate: number;
  }[];
}

interface WinRateStats {
  total_closed: number;
  won: number;
  lost: number;
  win_rate: number;
  won_value: number;
  lost_value: number;
  average_deal_size: number;
}

const TYPE_LABELS: Record<string, string> = {
  CALL: "Cuoc goi",
  EMAIL: "Email",
  MEETING: "Cuoc hop",
  TASK: "Cong viec",
  NOTE: "Ghi chu",
  VISIT: "Tham KH",
  DEMO: "Demo",
  FOLLOW_UP: "Theo doi",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <Phone className="w-4 h-4" />,
  EMAIL: <Mail className="w-4 h-4" />,
  MEETING: <Calendar className="w-4 h-4" />,
  TASK: <CheckCircle className="w-4 h-4" />,
};

export default function SalesPerformancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activityStats, setActivityStats] = useState<ActivitySummary | null>(null);
  const [winRate, setWinRate] = useState<WinRateStats | null>(null);
  const [periodDays, setPeriodDays] = useState(30);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [router, periodDays]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [activityRes, winRateRes] = await Promise.all([
        apiFetch<ActivitySummary>(`/crm/dashboard/activity-summary?period_days=${periodDays}`),
        apiFetch<WinRateStats>(`/crm/dashboard/win-rate?period_days=${periodDays * 3}`),
      ]);

      setActivityStats(activityRes);
      setWinRate(winRateRes);
    } catch (error) {
      console.error("Failed to fetch performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + " ty";
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(0) + " trieu";
    }
    return new Intl.NumberFormat("vi-VN").format(value) + " d";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hieu suat Ban hang</h1>
          <p className="text-gray-600 mt-1">Theo doi hoat dong va hieu suat doi ngu ban hang</p>
        </div>
        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>7 ngay qua</option>
          <option value={30}>30 ngay qua</option>
          <option value={60}>60 ngay qua</option>
          <option value={90}>90 ngay qua</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tong hoat dong</div>
              <div className="text-2xl font-bold">{activityStats?.total || 0}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Hoan thanh</div>
              <div className="text-2xl font-bold text-green-600">{activityStats?.completed || 0}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Dang cho</div>
              <div className="text-2xl font-bold text-yellow-600">{activityStats?.pending || 0}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Ty le hoan thanh</div>
              <div className="text-2xl font-bold">{activityStats?.completion_rate || 0}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Breakdown & Win Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Hoat dong theo loai</h2>
          {activityStats && activityStats.by_type.length > 0 ? (
            <div className="space-y-4">
              {activityStats.by_type.map((type) => (
                <div key={type.type} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                    {TYPE_ICONS[type.type] || <CheckCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {TYPE_LABELS[type.type] || type.type}
                      </span>
                      <span className="text-sm text-gray-600">
                        {type.completed}/{type.total} ({type.completion_rate.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${type.completion_rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Chua co du lieu hoat dong
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Hieu suat dong deal</h2>
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                <div className="text-center text-white">
                  <div className="text-3xl font-bold">{winRate?.win_rate || 0}%</div>
                  <div className="text-sm opacity-80">Win Rate</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{winRate?.won || 0}</div>
                <div className="text-sm text-gray-600">Deals thanh cong</div>
                <div className="text-sm font-medium text-green-600 mt-1">
                  {formatCurrency(winRate?.won_value || 0)}
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{winRate?.lost || 0}</div>
                <div className="text-sm text-gray-600">Deals that bai</div>
                <div className="text-sm font-medium text-red-600 mt-1">
                  {formatCurrency(winRate?.lost_value || 0)}
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">TB gia tri deal thanh cong</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatCurrency(winRate?.average_deal_size || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Tong ket hieu suat</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <Award className="w-12 h-12 mx-auto text-green-600 mb-3" />
            <div className="text-3xl font-bold text-green-600 mb-1">
              {activityStats?.completion_rate || 0}%
            </div>
            <div className="text-gray-600">Ty le hoan thanh hoat dong</div>
            <div className="text-sm text-gray-500 mt-2">
              {activityStats?.completed || 0} / {activityStats?.total || 0} hoat dong
            </div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <Target className="w-12 h-12 mx-auto text-blue-600 mb-3" />
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {winRate?.win_rate || 0}%
            </div>
            <div className="text-gray-600">Ty le thang deal</div>
            <div className="text-sm text-gray-500 mt-2">
              {winRate?.won || 0} / {winRate?.total_closed || 0} deals
            </div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <TrendingUp className="w-12 h-12 mx-auto text-purple-600 mb-3" />
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {formatCurrency(winRate?.average_deal_size || 0)}
            </div>
            <div className="text-gray-600">TB gia tri deal</div>
            <div className="text-sm text-gray-500 mt-2">
              Tong: {formatCurrency(winRate?.won_value || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
