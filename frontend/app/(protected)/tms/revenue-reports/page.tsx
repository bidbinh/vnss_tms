"use client";

import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

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

export default function RevenueReportsPage() {
  const [reportData, setReportData] = useState<RevenueReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<"customer" | "driver" | "route">("customer");

  useEffect(() => {
    fetchReport();
  }, [year, month]);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/revenue-reports/summary?year=${year}&month=${month}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        }
      );
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }
        throw new Error("Không thể tải báo cáo. Vui lòng thử lại.");
      }
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      console.error("Error fetching report:", err);
      setError(err.message || "Có lỗi xảy ra khi tải báo cáo");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(Math.round(amount));
  }

  function formatNumber(num: number): string {
    return new Intl.NumberFormat("vi-VN").format(num);
  }

  const MONTH_NAMES = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  return (
    <div className="p-6 max-w-full overflow-x-hidden bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Báo cáo cước vận chuyển</h1>
        <p className="text-gray-600">Thống kê doanh thu từ các đơn hàng đã giao</p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Năm</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || currentDate.getFullYear())}
              className="w-full text-sm border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="2020"
              max="2099"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">📆 Tháng</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full text-sm border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Đang tải..." : "🔄 Làm mới"}
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="text-sm font-semibold text-red-800">Lỗi</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-sm">Đang tải dữ liệu...</p>
        </div>
      )}

      {/* Report Data */}
      {reportData && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium opacity-90">Tổng doanh thu</div>
                <span className="text-2xl">💵</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(reportData.summary.total_revenue)}
              </div>
              <div className="text-sm opacity-75">VND</div>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium opacity-90">Số chuyến hàng</div>
                <span className="text-2xl">📦</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatNumber(reportData.summary.total_orders)}
              </div>
              <div className="text-sm opacity-75">chuyến</div>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium opacity-90">Cước TB/chuyến</div>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(reportData.summary.average_revenue_per_order)}
              </div>
              <div className="text-sm opacity-75">VND</div>
            </div>

            <div className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium opacity-90">Tổng quãng đường</div>
                <span className="text-2xl">🛣️</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatNumber(reportData.summary.total_distance_km)}
              </div>
              <div className="text-sm opacity-75">km</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <div className="flex flex-wrap gap-0">
                <button
                  onClick={() => setActiveTab("customer")}
                  className={`flex-1 min-w-[150px] px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === "customer"
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-2">👥</span>
                  Theo khách hàng
                </button>
                <button
                  onClick={() => setActiveTab("driver")}
                  className={`flex-1 min-w-[150px] px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === "driver"
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-2">🚚</span>
                  Theo tài xế
                </button>
                <button
                  onClick={() => setActiveTab("route")}
                  className={`flex-1 min-w-[150px] px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === "route"
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-2">🗺️</span>
                  Theo tuyến đường
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* By Customer */}
              {activeTab === "customer" && (
                <div className="overflow-x-auto">
                  {reportData.by_customer.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <span className="text-4xl mb-4 block">📭</span>
                      <p>Không có dữ liệu khách hàng</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Khách hàng</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Doanh thu</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Số chuyến</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">TB/chuyến</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Quãng đường (km)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.by_customer.map((customer, idx) => (
                          <tr key={customer.customer_id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs mr-3">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-gray-900">{customer.customer_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-bold text-blue-600">
                                {formatCurrency(customer.total_revenue)} ₫
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-700">
                              {formatNumber(customer.order_count)}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600">
                              {formatCurrency(Math.round(customer.total_revenue / customer.order_count))} ₫
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600">
                              {formatNumber(customer.total_distance_km)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* By Driver */}
              {activeTab === "driver" && (
                <div className="overflow-x-auto">
                  {reportData.by_driver.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <span className="text-4xl mb-4 block">📭</span>
                      <p>Không có dữ liệu tài xế</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Tài xế</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Doanh thu</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Số chuyến</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">TB/chuyến</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Quãng đường (km)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.by_driver.map((driver, idx) => (
                          <tr key={driver.driver_id} className="hover:bg-green-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold text-xs mr-3">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-gray-900">{driver.driver_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-bold text-green-600">
                                {formatCurrency(driver.total_revenue)} ₫
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-700">
                              {formatNumber(driver.order_count)}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600">
                              {formatCurrency(Math.round(driver.total_revenue / driver.order_count))} ₫
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600">
                              {formatNumber(driver.total_distance_km)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* By Route */}
              {activeTab === "route" && (
                <div className="overflow-x-auto">
                  {reportData.by_route.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <span className="text-4xl mb-4 block">📭</span>
                      <p>Không có dữ liệu tuyến đường</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Tuyến đường</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Doanh thu</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Số chuyến</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">TB/chuyến</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Quãng đường (km)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.by_route.map((route, idx) => (
                          <tr key={idx} className="hover:bg-purple-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold text-xs mr-3">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-gray-900">{route.route}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-bold text-purple-600">
                                {formatCurrency(route.total_revenue)} ₫
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-700">
                              {formatNumber(route.order_count)}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600">
                              {formatCurrency(Math.round(route.total_revenue / route.order_count))} ₫
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600">
                              {formatNumber(route.total_distance_km)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {reportData && reportData.summary.total_orders === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
          <span className="text-6xl mb-4 block">📊</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Không có dữ liệu
          </h3>
          <p className="text-gray-600">
            Không có dữ liệu doanh thu cho tháng {month}/{year}
          </p>
        </div>
      )}
    </div>
  );
}
