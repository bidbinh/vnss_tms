"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  Ship,
  Plane,
  Truck,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
} from "lucide-react";

interface ShipmentStats {
  total_shipments: number;
  by_type: Record<string, number>;
  by_mode: Record<string, number>;
  by_status: Record<string, number>;
  by_month: { month: string; count: number }[];
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  top_routes: { route: string; count: number }[];
  top_customers: { name: string; count: number }[];
}

export default function ShipmentReportsPage() {
  const [stats, setStats] = useState<ShipmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/reports/shipments?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        // Mock data for demo
        setStats({
          total_shipments: 156,
          by_type: { EXPORT: 89, IMPORT: 52, CROSS_TRADE: 15 },
          by_mode: { SEA_FCL: 78, SEA_LCL: 34, AIR: 32, ROAD: 12 },
          by_status: { COMPLETED: 120, IN_TRANSIT: 25, DRAFT: 11 },
          by_month: [
            { month: "10/2024", count: 45 },
            { month: "11/2024", count: 52 },
            { month: "12/2024", count: 59 },
          ],
          total_revenue: 1250000,
          total_cost: 980000,
          total_profit: 270000,
          top_routes: [
            { route: "VNSGN → USNYC", count: 23 },
            { route: "VNHPH → CNSHA", count: 18 },
            { route: "VNDAD → JPYOK", count: 15 },
            { route: "VNSGN → DEHAM", count: 12 },
            { route: "VNHPH → KRPUS", count: 10 },
          ],
          top_customers: [
            { name: "ABC Trading Co.", count: 28 },
            { name: "XYZ Export Ltd.", count: 22 },
            { name: "Vietnam Garment", count: 18 },
            { name: "Tech Solutions", count: 15 },
            { name: "Global Furniture", count: 12 },
          ],
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải báo cáo:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchStats();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getModeIcon = (mode: string) => {
    if (mode.includes("SEA")) return <Ship className="w-5 h-5 text-blue-600" />;
    if (mode === "AIR") return <Plane className="w-5 h-5 text-purple-600" />;
    return <Truck className="w-5 h-5 text-green-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo Lô hàng</h1>
          <p className="text-gray-600">Thống kê và phân tích hoạt động vận chuyển</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-5 h-5" />
          Xuất báo cáo
        </button>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Từ ngày</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Đến ngày</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleFilter}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Filter className="w-5 h-5" />
            Lọc
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tổng lô hàng</p>
              <p className="text-2xl font-bold">{stats?.total_shipments || 0}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Doanh thu</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.total_revenue || 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Chi phí</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats?.total_cost || 0)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lợi nhuận</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats?.total_profit || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* By Type */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Theo loại hình</h3>
          <div className="space-y-3">
            {Object.entries(stats?.by_type || {}).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {type === "EXPORT" ? "Xuất khẩu" : type === "IMPORT" ? "Nhập khẩu" : "Chuyển tiếp"}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(count / (stats?.total_shipments || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Mode */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Theo phương thức</h3>
          <div className="space-y-3">
            {Object.entries(stats?.by_mode || {}).map(([mode, count]) => (
              <div key={mode} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getModeIcon(mode)}
                  <span className="text-sm text-gray-600">
                    {mode === "SEA_FCL" ? "Đường biển FCL" :
                     mode === "SEA_LCL" ? "Đường biển LCL" :
                     mode === "AIR" ? "Hàng không" : "Đường bộ"}
                  </span>
                </div>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Theo trạng thái</h3>
          <div className="space-y-3">
            {Object.entries(stats?.by_status || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  status === "COMPLETED" ? "bg-green-100 text-green-800" :
                  status === "IN_TRANSIT" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {status === "COMPLETED" ? "Hoàn thành" :
                   status === "IN_TRANSIT" ? "Đang vận chuyển" : "Nháp"}
                </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Routes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Tuyến đường phổ biến</h3>
          <div className="space-y-3">
            {stats?.top_routes?.map((route, index) => (
              <div key={route.route} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index === 0 ? "bg-yellow-100 text-yellow-800" :
                    index === 1 ? "bg-gray-100 text-gray-800" :
                    index === 2 ? "bg-orange-100 text-orange-800" :
                    "bg-gray-50 text-gray-600"
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-sm">{route.route}</span>
                </div>
                <span className="font-medium">{route.count} lô</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Khách hàng hàng đầu</h3>
          <div className="space-y-3">
            {stats?.top_customers?.map((customer, index) => (
              <div key={customer.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index === 0 ? "bg-yellow-100 text-yellow-800" :
                    index === 1 ? "bg-gray-100 text-gray-800" :
                    index === 2 ? "bg-orange-100 text-orange-800" :
                    "bg-gray-50 text-gray-600"
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-sm">{customer.name}</span>
                </div>
                <span className="font-medium">{customer.count} lô</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Xu hướng theo tháng</h3>
        <div className="flex items-end gap-4 h-48">
          {stats?.by_month?.map((month) => (
            <div key={month.month} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t-lg"
                style={{ height: `${(month.count / Math.max(...(stats?.by_month?.map(m => m.count) || [1]))) * 150}px` }}
              />
              <p className="text-xs text-gray-600 mt-2">{month.month}</p>
              <p className="text-sm font-medium">{month.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
