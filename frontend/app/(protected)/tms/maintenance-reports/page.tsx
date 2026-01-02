"use client";

import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

interface MaintenanceSummary {
  total_cost: number;
  total_services: number;
  average_cost_per_service: number;
}

interface VehicleCost {
  vehicle_id: string;
  vehicle_plate: string;
  vehicle_code: string;
  total_cost: number;
  service_count: number;
}

interface TypeCost {
  maintenance_type: string;
  total_cost: number;
  service_count: number;
}

interface GarageCost {
  garage_name: string;
  total_cost: number;
  service_count: number;
}

interface MaintenanceReportData {
  year: number;
  month: number;
  summary: MaintenanceSummary;
  by_vehicle: VehicleCost[];
  by_type: TypeCost[];
  by_garage: GarageCost[];
}

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  OIL_CHANGE: "🛢️ Đổi dầu",
  PERIODIC: "🔧 Bảo dưỡng định kỳ",
  TIRE_REPLACEMENT: "🛞 Thay lốp",
  BRAKE_SERVICE: "🛑 Bảo dưỡng phanh",
  BATTERY_CHECK: "🔋 Kiểm tra ắc quy",
  ENGINE_TUNE: "⚙️ Điều chỉnh động cơ",
  TRANSMISSION_SERVICE: "⚙️ Bảo dưỡng hộp số",
  COOLANT_CHANGE: "💧 Thay nước làm mát",
  AIR_FILTER: "🌬️ Thay lọc gió",
  OTHER: "🔨 Khác",
};

export default function MaintenanceReportsPage() {
  const [reportData, setReportData] = useState<MaintenanceReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<"vehicle" | "type" | "garage">("vehicle");

  useEffect(() => {
    fetchReport();
  }, [year, month]);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/maintenance-reports/summary?year=${year}&month=${month}`,
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

  function getMaintenanceTypeLabel(type: string): string {
    return MAINTENANCE_TYPE_LABELS[type] || type;
  }

  const MONTH_NAMES = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  return (
    <div className="p-6 max-w-full overflow-x-hidden bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Báo cáo chi phí bảo trì</h1>
        <p className="text-gray-600">Thống kê chi phí bảo trì, bảo dưỡng và sửa chữa xe</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-6 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium opacity-90">Tổng chi phí</div>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(reportData.summary.total_cost)}
              </div>
              <div className="text-sm opacity-75">VND</div>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium opacity-90">Số lần bảo trì</div>
                <span className="text-2xl">🔧</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatNumber(reportData.summary.total_services)}
              </div>
              <div className="text-sm opacity-75">lần</div>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium opacity-90">Chi phí TB/lần</div>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(reportData.summary.average_cost_per_service)}
              </div>
              <div className="text-sm opacity-75">VND</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <div className="flex flex-wrap gap-0">
                <button
                  onClick={() => setActiveTab("vehicle")}
                  className={`flex-1 min-w-[150px] px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === "vehicle"
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-2">🚛</span>
                  Theo xe
                </button>
                <button
                  onClick={() => setActiveTab("type")}
                  className={`flex-1 min-w-[150px] px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === "type"
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-2">🔨</span>
                  Theo loại bảo trì
                </button>
                <button
                  onClick={() => setActiveTab("garage")}
                  className={`flex-1 min-w-[150px] px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === "garage"
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-2">🏭</span>
                  Theo garage
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* By Vehicle */}
              {activeTab === "vehicle" && (
                <div className="overflow-x-auto">
                  {reportData.by_vehicle.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <span className="text-4xl mb-4 block">📭</span>
                      <p>Không có dữ liệu xe</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Biển số xe</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Mã xe</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Tổng chi phí</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Số lần BT</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">TB/lần</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.by_vehicle.map((vehicle, idx) => (
                          <tr key={vehicle.vehicle_id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs mr-3">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-gray-900">{vehicle.vehicle_plate}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{vehicle.vehicle_code || "-"}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="font-bold text-red-600">
                                {formatCurrency(vehicle.total_cost)} ₫
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-700">
                              {formatNumber(vehicle.service_count)}
                            </td>
                            <td className="px-6 py-4 text-right text-gray-600">
                              {formatCurrency(Math.round(vehicle.total_cost / vehicle.service_count))} ₫
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* By Type */}
              {activeTab === "type" && (
                <div className="overflow-x-auto">
                  {reportData.by_type.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <span className="text-4xl mb-4 block">📭</span>
                      <p>Không có dữ liệu loại bảo trì</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Loại bảo trì</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Tổng chi phí</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Số lần BT</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">TB/lần</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">% Chi phí</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.by_type.map((type, idx) => {
                          const percentage = reportData.summary.total_cost > 0
                            ? (type.total_cost / reportData.summary.total_cost * 100)
                            : 0;
                          return (
                            <tr key={idx} className="hover:bg-green-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold text-xs mr-3">
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {getMaintenanceTypeLabel(type.maintenance_type)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="font-bold text-red-600">
                                  {formatCurrency(type.total_cost)} ₫
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-700">
                                {formatNumber(type.service_count)}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-600">
                                {formatCurrency(Math.round(type.total_cost / type.service_count))} ₫
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {percentage.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* By Garage */}
              {activeTab === "garage" && (
                <div className="overflow-x-auto">
                  {reportData.by_garage.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <span className="text-4xl mb-4 block">📭</span>
                      <p>Không có dữ liệu garage</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Garage</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Tổng chi phí</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Số lần BT</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">TB/lần</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">% Chi phí</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.by_garage.map((garage, idx) => {
                          const percentage = reportData.summary.total_cost > 0
                            ? (garage.total_cost / reportData.summary.total_cost * 100)
                            : 0;
                          return (
                            <tr key={idx} className="hover:bg-purple-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center">
                                  <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold text-xs mr-3">
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium text-gray-900">{garage.garage_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="font-bold text-red-600">
                                  {formatCurrency(garage.total_cost)} ₫
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-700">
                                {formatNumber(garage.service_count)}
                              </td>
                              <td className="px-6 py-4 text-right text-gray-600">
                                {formatCurrency(Math.round(garage.total_cost / garage.service_count))} ₫
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {percentage.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
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
      {reportData && reportData.summary.total_services === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
          <span className="text-6xl mb-4 block">🔧</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Không có dữ liệu
          </h3>
          <p className="text-gray-600">
            Không có dữ liệu bảo trì cho tháng {month}/{year}
          </p>
        </div>
      )}
    </div>
  );
}
