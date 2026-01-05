"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench,
  Truck,
  Settings,
  Building2,
  RefreshCw,
  Download,
  Calculator,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============================================================================
// TYPES
// ============================================================================

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
  OIL_CHANGE: "Thay dầu",
  PERIODIC: "Bảo dưỡng định kỳ",
  TIRE_REPLACEMENT: "Thay lốp",
  BRAKE_SERVICE: "Bảo dưỡng phanh",
  BATTERY_CHECK: "Kiểm tra ắc quy",
  ENGINE_TUNE: "Điều chỉnh động cơ",
  TRANSMISSION_SERVICE: "Bảo dưỡng hộp số",
  COOLANT_CHANGE: "Thay nước làm mát",
  AIR_FILTER: "Thay lọc gió",
  OTHER: "Khác",
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function MaintenanceReportsPage() {
  const [reportData, setReportData] = useState<MaintenanceReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"vehicle" | "type" | "garage">("vehicle");

  // Filter states - default to current year/month
  const currentDate = new Date();
  const [filterYear, setFilterYear] = useState<number>(currentDate.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number>(currentDate.getMonth() + 1);

  // Fetch data
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = `/maintenance-reports/summary?year=${filterYear}&month=${filterMonth}`;
      const data = await apiFetch<MaintenanceReportData>(url);
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch maintenance report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterYear, filterMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const formatNumber = (n: number) => Math.round(n).toLocaleString("vi-VN");
  const formatPercent = (n: number) => `${n.toFixed(1)}%`;

  function getMaintenanceTypeLabel(type: string): string {
    return MAINTENANCE_TYPE_LABELS[type] || type;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-7 h-7 text-orange-600" />
            Báo cáo chi phí bảo trì
          </h1>
          <p className="text-gray-600 mt-1">
            Thống kê chi phí bảo trì, bảo dưỡng và sửa chữa xe
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
              onClick={() => setActiveTab("vehicle")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                activeTab === "vehicle"
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Truck className="w-4 h-4" />
              Theo Xe
            </button>
            <button
              onClick={() => setActiveTab("type")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                activeTab === "type"
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Settings className="w-4 h-4" />
              Theo Loại
            </button>
            <button
              onClick={() => setActiveTab("garage")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                activeTab === "garage"
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Theo Garage
            </button>
          </div>

          <div className="h-6 border-l border-gray-300" />

          {/* Year */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Calculator className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tổng chi phí</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(reportData.summary.total_cost)}{" "}
                  <span className="text-sm font-normal text-gray-500">đ</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wrench className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Số lần bảo trì</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(reportData.summary.total_services)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">TB/lần</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(reportData.summary.average_cost_per_service)}{" "}
                  <span className="text-sm font-normal text-gray-500">đ</span>
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
            <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có dữ liệu</p>
          </div>
        ) : (
          <>
            {/* By Vehicle */}
            {activeTab === "vehicle" && (
              reportData.by_vehicle.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Không có dữ liệu theo xe</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Biển số
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Mã xe
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Chi phí
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Số lần
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          TB/lần
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.by_vehicle.map((vehicle) => (
                        <tr key={vehicle.vehicle_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                                {vehicle.vehicle_plate}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {vehicle.vehicle_code || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-red-600">
                              {formatNumber(vehicle.total_cost)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium">{vehicle.service_count}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {formatNumber(Math.round(vehicle.total_cost / vehicle.service_count))} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* By Type */}
            {activeTab === "type" && (
              reportData.by_type.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Không có dữ liệu theo loại bảo trì</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Loại bảo trì
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Chi phí
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Số lần
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          TB/lần
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Tỷ lệ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.by_type.map((type, idx) => {
                        const percentage = reportData.summary.total_cost > 0
                          ? (type.total_cost / reportData.summary.total_cost * 100)
                          : 0;
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                  {getMaintenanceTypeLabel(type.maintenance_type)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-red-600">
                                {formatNumber(type.total_cost)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-medium">{type.service_count}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {formatNumber(Math.round(type.total_cost / type.service_count))} đ
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-1 rounded text-sm font-medium ${
                                  percentage >= 30
                                    ? "bg-red-100 text-red-700"
                                    : percentage >= 15
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {formatPercent(percentage)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* By Garage */}
            {activeTab === "garage" && (
              reportData.by_garage.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Không có dữ liệu theo garage</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Garage
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Chi phí
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Số lần
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          TB/lần
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Tỷ lệ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.by_garage.map((garage, idx) => {
                        const percentage = reportData.summary.total_cost > 0
                          ? (garage.total_cost / reportData.summary.total_cost * 100)
                          : 0;
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                  {garage.garage_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-red-600">
                                {formatNumber(garage.total_cost)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-medium">{garage.service_count}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {formatNumber(Math.round(garage.total_cost / garage.service_count))} đ
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2 py-1 rounded text-sm font-medium ${
                                  percentage >= 30
                                    ? "bg-red-100 text-red-700"
                                    : percentage >= 15
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {formatPercent(percentage)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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
