"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Award,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface WinRateStats {
  total_closed: number;
  won: number;
  lost: number;
  win_rate: number;
  won_value: number;
  lost_value: number;
  average_deal_size: number;
}

interface TopAccount {
  id: string;
  code: string;
  name: string;
  total_value: number;
}

export default function RevenueAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [winRate, setWinRate] = useState<WinRateStats | null>(null);
  const [topAccounts, setTopAccounts] = useState<TopAccount[]>([]);
  const [periodDays, setPeriodDays] = useState(90);

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
      const [winRateRes, topAccountsRes] = await Promise.all([
        apiFetch<WinRateStats>(`/crm/dashboard/win-rate?period_days=${periodDays}`),
        apiFetch<{ items: TopAccount[] }>("/crm/dashboard/top-accounts?limit=10"),
      ]);

      setWinRate(winRateRes);
      setTopAccounts(topAccountsRes.items);
    } catch (error) {
      console.error("Failed to fetch revenue data:", error);
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

  const formatFullCurrency = (value: number) => {
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
          <h1 className="text-2xl font-bold text-gray-900">Phan tich Doanh thu</h1>
          <p className="text-gray-600 mt-1">Thong ke doanh thu va hieu qua ban hang</p>
        </div>
        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value={30}>30 ngay qua</option>
          <option value={90}>90 ngay qua</option>
          <option value={180}>6 thang qua</option>
          <option value={365}>1 nam qua</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Doanh thu thanh cong</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(winRate?.won_value || 0)}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Gia tri mat</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(winRate?.lost_value || 0)}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Ty le thang</div>
              <div className="text-2xl font-bold">
                {winRate?.win_rate || 0}%
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">TB gia tri deal</div>
              <div className="text-2xl font-bold">
                {formatCurrency(winRate?.average_deal_size || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Win/Loss Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Thang / Thua</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Thanh cong</span>
                <span className="font-medium text-green-600">{winRate?.won || 0} deals</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-500 h-4 rounded-full"
                  style={{
                    width: `${winRate?.total_closed
                      ? (winRate.won / winRate.total_closed) * 100
                      : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">That bai</span>
                <span className="font-medium text-red-600">{winRate?.lost || 0} deals</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-red-500 h-4 rounded-full"
                  style={{
                    width: `${winRate?.total_closed
                      ? (winRate.lost / winRate.total_closed) * 100
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between">
              <span className="text-gray-600">Tong so deals dong</span>
              <span className="font-bold">{winRate?.total_closed || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Gia tri Thang / Thua</h2>
          <div className="space-y-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-700">Doanh thu thanh cong</span>
                </div>
                <span className="text-xl font-bold text-green-700">
                  {formatFullCurrency(winRate?.won_value || 0)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-700">Gia tri that bai</span>
                </div>
                <span className="text-xl font-bold text-red-700">
                  {formatFullCurrency(winRate?.lost_value || 0)}
                </span>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-700">Trung binh moi deal thanh cong</span>
                </div>
                <span className="text-xl font-bold text-blue-700">
                  {formatFullCurrency(winRate?.average_deal_size || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Accounts */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Top 10 Khach hang theo doanh thu</h2>
        {topAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ma</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ten khach hang</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tong doanh thu</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Tong</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topAccounts.map((account, index) => {
                  const totalRevenue = topAccounts.reduce((sum, a) => sum + a.total_value, 0);
                  const percentage = totalRevenue > 0 ? ((account.total_value / totalRevenue) * 100).toFixed(1) : "0";

                  return (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-blue-600">{account.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{account.name}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatFullCurrency(account.total_value)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chua co du lieu doanh thu
          </div>
        )}
      </div>
    </div>
  );
}
