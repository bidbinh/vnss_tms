"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Phone,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface LeadConversionStats {
  total_leads: number;
  converted: number;
  lost: number;
  open: number;
  conversion_rate: number;
  by_source: {
    source: string;
    total: number;
    converted: number;
    rate: number;
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

interface TopAccount {
  id: string;
  code: string;
  name: string;
  total_value: number;
}

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  REFERRAL: "Giới thiệu",
  COLD_CALL: "Gọi điện",
  SOCIAL_MEDIA: "Mạng xã hội",
  TRADE_SHOW: "Triển lãm",
  ADVERTISEMENT: "Quảng cáo",
  EMAIL_CAMPAIGN: "Email marketing",
  PARTNER: "Đối tác",
  OTHER: "Khác",
  UNKNOWN: "Không xác định",
};

const TYPE_LABELS: Record<string, string> = {
  CALL: "Cuộc gọi",
  EMAIL: "Email",
  MEETING: "Cuộc họp",
  TASK: "Công việc",
  NOTE: "Ghi chú",
  VISIT: "Thăm KH",
  DEMO: "Demo",
  FOLLOW_UP: "Theo dõi",
};

export default function CRMReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leadStats, setLeadStats] = useState<LeadConversionStats | null>(null);
  const [winRate, setWinRate] = useState<WinRateStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivitySummary | null>(null);
  const [topAccounts, setTopAccounts] = useState<TopAccount[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchReportsData();
  }, [router]);

  const fetchReportsData = async () => {
    try {
      const [leadRes, winRes, activityRes, topRes] = await Promise.all([
        apiFetch<LeadConversionStats>("/crm/dashboard/lead-conversion?period_days=90").catch(() => null),
        apiFetch<WinRateStats>("/crm/dashboard/win-rate?period_days=90").catch(() => null),
        apiFetch<ActivitySummary>("/crm/dashboard/activity-summary?period_days=30").catch(() => null),
        apiFetch<{ items: TopAccount[] }>("/crm/dashboard/top-accounts?limit=10").catch(() => null),
      ]);

      if (leadRes) setLeadStats(leadRes);
      if (winRes) setWinRate(winRes);
      if (activityRes) setActivityStats(activityRes);
      if (topRes) setTopAccounts(topRes.items);
    } catch (error) {
      console.error("Failed to fetch reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + " tỷ";
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(0) + " triệu";
    }
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo CRM</h1>
        <p className="text-gray-600 mt-1">Phân tích và thống kê hoạt động bán hàng</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lead Conversion Rate */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Tỷ lệ chuyển đổi Lead</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {leadStats?.conversion_rate || 0}%
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {leadStats?.converted || 0} / {leadStats?.total_leads || 0} leads
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Tỷ lệ thành công</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {winRate?.win_rate || 0}%
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {winRate?.won || 0} / {winRate?.total_closed || 0} cơ hội
          </div>
        </div>

        {/* Won Value */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Giá trị thành công</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(winRate?.won_value || 0)}
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            TB: {formatCurrency(winRate?.average_deal_size || 0)}/deal
          </div>
        </div>

        {/* Activity Completion */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Hoàn thành hoạt động</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {activityStats?.completion_rate || 0}%
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Phone className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {activityStats?.completed || 0} / {activityStats?.total || 0} hoạt động
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Nguồn Lead</h2>
          {leadStats && leadStats.by_source.length > 0 ? (
            <div className="space-y-4">
              {leadStats.by_source.map((source) => (
                <div key={source.source}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {SOURCE_LABELS[source.source] || source.source}
                    </span>
                    <span className="font-medium">
                      {source.converted}/{source.total} ({source.rate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${source.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Chưa có dữ liệu nguồn lead
            </div>
          )}
        </div>

        {/* Activity by Type */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Hoạt động theo loại</h2>
          {activityStats && activityStats.by_type.length > 0 ? (
            <div className="space-y-4">
              {activityStats.by_type.map((type) => (
                <div key={type.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {TYPE_LABELS[type.type] || type.type}
                    </span>
                    <span className="font-medium">
                      {type.completed}/{type.total} ({type.completion_rate.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${type.completion_rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Chưa có dữ liệu hoạt động
            </div>
          )}
        </div>
      </div>

      {/* Won vs Lost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Thành công vs Thất bại</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <ArrowUpRight className="w-5 h-5" />
                <span className="font-medium">Thành công</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{winRate?.won || 0}</div>
              <div className="text-sm text-green-600 mt-1">
                {formatCurrency(winRate?.won_value || 0)}
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <ArrowDownRight className="w-5 h-5" />
                <span className="font-medium">Thất bại</span>
              </div>
              <div className="text-2xl font-bold text-red-700">{winRate?.lost || 0}</div>
              <div className="text-sm text-red-600 mt-1">
                {formatCurrency(winRate?.lost_value || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Lead Status */}
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Trạng thái Lead</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{leadStats?.open || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Đang mở</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{leadStats?.converted || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Chuyển đổi</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{leadStats?.lost || 0}</div>
              <div className="text-sm text-gray-600 mt-1">Thất bại</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Accounts */}
      <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Top 10 Khách hàng theo doanh thu</h2>
          <Link href="/crm/accounts" className="text-sm text-blue-600 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {topAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên khách hàng</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tổng giá trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topAccounts.map((account, index) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/crm/accounts/${account.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {account.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{account.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatFullCurrency(account.total_value)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chưa có dữ liệu khách hàng
          </div>
        )}
      </div>
    </div>
  );
}
