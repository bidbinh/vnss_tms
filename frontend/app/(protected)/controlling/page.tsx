"use client";

import { useState, useEffect } from "react";
import {
  PiggyBank,
  Layers,
  TrendingUp,
  ClipboardList,
  Target,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface DashboardStats {
  total_cost_centers: number;
  total_budgets: number;
  total_profit_centers: number;
  total_internal_orders: number;
  budget_utilization: number;
  ytd_costs: number;
  ytd_revenue: number;
}

export default function ControllingDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_cost_centers: 0,
    total_budgets: 0,
    total_profit_centers: 0,
    total_internal_orders: 0,
    budget_utilization: 0,
    ytd_costs: 0,
    ytd_revenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading dashboard data
    setTimeout(() => {
      setStats({
        total_cost_centers: 24,
        total_budgets: 12,
        total_profit_centers: 8,
        total_internal_orders: 156,
        budget_utilization: 67.5,
        ytd_costs: 2450000000,
        ytd_revenue: 3850000000,
      });
      setLoading(false);
    }, 500);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statCards = [
    {
      title: "Cost Centers",
      value: stats.total_cost_centers,
      icon: Layers,
      color: "bg-blue-500",
      href: "/controlling/cost-centers",
    },
    {
      title: "Budgets",
      value: stats.total_budgets,
      icon: PiggyBank,
      color: "bg-green-500",
      href: "/controlling/budgets",
    },
    {
      title: "Profit Centers",
      value: stats.total_profit_centers,
      icon: TrendingUp,
      color: "bg-purple-500",
      href: "/controlling/profit-centers",
    },
    {
      title: "Internal Orders",
      value: stats.total_internal_orders,
      icon: ClipboardList,
      color: "bg-orange-500",
      href: "/controlling/internal-orders",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controlling Dashboard</h1>
          <p className="text-gray-500">Quản trị chi phí và ngân sách</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <a
            key={card.title}
            href={card.href}
            className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Budget Utilization</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${stats.budget_utilization}%` }}
                />
              </div>
            </div>
            <span className="text-xl font-bold">{stats.budget_utilization}%</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Đã sử dụng {stats.budget_utilization}% ngân sách năm
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">YTD Performance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-red-500" />
                <span className="text-gray-600">Chi phí</span>
              </div>
              <span className="font-semibold text-red-600">
                {formatCurrency(stats.ytd_costs)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-green-500" />
                <span className="text-gray-600">Doanh thu</span>
              </div>
              <span className="font-semibold text-green-600">
                {formatCurrency(stats.ytd_revenue)}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Lợi nhuận</span>
                <span className="font-bold text-xl text-green-600">
                  {formatCurrency(stats.ytd_revenue - stats.ytd_costs)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/controlling/cost-centers"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <Layers className="w-5 h-5 text-blue-500" />
            <span>Cost Centers</span>
          </a>
          <a
            href="/controlling/budgets"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <PiggyBank className="w-5 h-5 text-green-500" />
            <span>Budgets</span>
          </a>
          <a
            href="/controlling/activity-types"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <Target className="w-5 h-5 text-purple-500" />
            <span>Activity Types</span>
          </a>
          <a
            href="/controlling/profit-centers"
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <span>Profit Analysis</span>
          </a>
        </div>
      </div>
    </div>
  );
}
