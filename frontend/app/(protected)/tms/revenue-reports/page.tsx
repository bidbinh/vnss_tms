"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Truck,
  Route,
  Users,
  UserCircle,
  RefreshCw,
  Download,
  MapPin,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============================================================================
// TYPES
// ============================================================================

interface RevenueSummary {
  total_revenue: number;
  total_orders: number;
  average_revenue_per_order: number;
  total_distance_km: number;
}

interface CustomerRevenue {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  order_count: number;
  total_distance_km: number;
}

interface DriverRevenue {
  driver_id: string;
  driver_name: string;
  total_revenue: number;
  order_count: number;
  total_distance_km: number;
}

interface RouteRevenue {
  route: string;
  pickup: string;
  delivery: string;
  total_revenue: number;
  order_count: number;
  total_distance_km: number;
}

interface RevenueReportData {
  year: number;
  month: number;
  summary: RevenueSummary;
  by_customer: CustomerRevenue[];
  by_driver: DriverRevenue[];
  by_route: RouteRevenue[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RevenueReportsPage() {
  const [reportData, setReportData] = useState<RevenueReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"customer" | "driver" | "route">("customer");

  // Filter states - default to current year/month
  const currentDate = new Date();
  const [filterYear, setFilterYear] = useState<number>(currentDate.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(currentDate.getMonth() + 1);

  // Fetch data
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = `/revenue-reports/summary?year=${filterYear}&month=${filterMonth}`;
      const data = await apiFetch<RevenueReportData>(url);
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch revenue report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterYear, filterMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const formatNumber = (n: number) => Math.round(n).toLocaleString("vi-VN");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Báo cáo cước vận chuyển
          </h1>
          <p className="text-gray-600 mt-1">
            Thống kê doanh thu từ các đơn hàng đã giao
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReport()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Làm mới"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Tabs */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveTab("customer")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                activeTab === "customer"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Users className="w-4 h-4" />
              Theo KH
            </button>
            <button
              onClick={() => setActiveTab("driver")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                activeTab === "driver"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <UserCircle className="w-4 h-4" />
              Theo Tài xế
            </button>
            <button
              onClick={() => setActiveTab("route")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                activeTab === "route"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Route className="w-4 h-4" />
              Theo Tuyến
            </button>
          </div>

          <div className="h-6 border-l border-gray-300" />

          {/* Year */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>

          {/* Month */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng doanh thu</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(reportData.summary.total_revenue)}{" "}
                  <span className="text-sm font-normal text-gray-500">đ</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Số chuyến</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(reportData.summary.total_orders)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">TB/chuyến</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(reportData.summary.average_revenue_per_order)}{" "}
                  <span className="text-sm font-normal text-gray-500">đ</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Route className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Quãng đường</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(reportData.summary.total_distance_km)}{" "}
                  <span className="text-sm font-normal text-gray-500">km</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
            Đang tải dữ liệu...
          </div>
        ) : !reportData ? (
          <div className="p-8 text-center text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có dữ liệu</p>
          </div>
        ) : (
          <>
            {/* By Customer */}
            {activeTab === "customer" && (
              reportData.by_customer.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Không có dữ liệu theo khách hàng</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Khách hàng
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Doanh thu
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Số chuyến
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          TB/chuyến
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Km
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.by_customer.map((customer) => (
                        <tr key={customer.customer_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {customer.customer_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-green-600">
                              {formatNumber(customer.total_revenue)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium">{customer.order_count}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {formatNumber(Math.round(customer.total_revenue / customer.order_count))} đ
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {formatNumber(customer.total_distance_km)} km
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* By Driver */}
            {activeTab === "driver" && (
              reportData.by_driver.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <UserCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Không có dữ liệu theo tài xế</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tài xế
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Doanh thu
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Số chuyến
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          TB/chuyến
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Km
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.by_driver.map((driver) => (
                        <tr key={driver.driver_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <UserCircle className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {driver.driver_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-green-600">
                              {formatNumber(driver.total_revenue)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium">{driver.order_count}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {formatNumber(Math.round(driver.total_revenue / driver.order_count))} đ
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {formatNumber(driver.total_distance_km)} km
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* By Route */}
            {activeTab === "route" && (
              reportData.by_route.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Route className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Không có dữ liệu theo tuyến đường</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tuyến đường
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Doanh thu
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Số chuyến
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          TB/chuyến
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Km
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.by_route.map((route, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {route.route}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-green-600">
                              {formatNumber(route.total_revenue)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium">{route.order_count}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {formatNumber(Math.round(route.total_revenue / route.order_count))} đ
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {formatNumber(route.total_distance_km)} km
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
