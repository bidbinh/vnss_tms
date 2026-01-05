"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Fuel,
  Truck,
  Route,
  Calculator,
  RefreshCw,
  Download,
  Gauge,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============================================================================
// TYPES
// ============================================================================

interface Vehicle {
  id: string;
  plate_no: string;
}

interface VehicleReport {
  vehicle_id: string;
  vehicle_plate: string;
  total_fuel_liters: number;
  total_cost: number;
  total_distance_km: number;
  consumption_per_100km: number;
  cost_per_km: number;
  fuel_log_count: number;
  first_odometer: number;
  last_odometer: number;
}

interface FleetSummary {
  total_vehicles: number;
  total_fuel_liters: number;
  total_cost: number;
  total_distance_km: number;
  avg_consumption_per_100km: number;
  avg_cost_per_km: number;
}

interface ConsumptionReport {
  fleet_summary: FleetSummary;
  vehicles: VehicleReport[];
  period: {
    start_date: string | null;
    end_date: string | null;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FuelReportsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [report, setReport] = useState<ConsumptionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch vehicles
  const fetchVehicles = useCallback(async () => {
    try {
      const data = await apiFetch<Vehicle[]>("/vehicles");
      setVehicles(data);
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    }
  }, []);

  // Fetch report
  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedVehicle) params.append("vehicle_id", selectedVehicle);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const url = `/fuel-reports/consumption${params.toString() ? `?${params}` : ""}`;
      const data = await apiFetch<ConsumptionReport>(url);
      setReport(data);
    } catch (err) {
      console.error("Failed to fetch fuel report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedVehicle, startDate, endDate]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

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
            <Fuel className="w-7 h-7 text-yellow-600" />
            Báo cáo tiêu hao nhiên liệu
          </h1>
          <p className="text-gray-600 mt-1">
            Thống kê mức tiêu thụ xăng dầu theo từng xe
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
        <div className="flex flex-wrap items-end gap-4">
          {/* Vehicle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Xe</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 min-w-[150px]"
            >
              <option value="">Tất cả xe</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_no}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 border-l border-gray-300" />

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Số xe</p>
                <p className="text-xl font-bold text-gray-900">
                  {report.fleet_summary.total_vehicles}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Route className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Quãng đường</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(report.fleet_summary.total_distance_km)}{" "}
                  <span className="text-sm font-normal text-gray-500">km</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Fuel className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Nhiên liệu</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(report.fleet_summary.total_fuel_liters)}{" "}
                  <span className="text-sm font-normal text-gray-500">lít</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Chi phí</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(report.fleet_summary.total_cost)}{" "}
                  <span className="text-sm font-normal text-gray-500">đ</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Gauge className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">TB tiêu hao</p>
                <p className="text-xl font-bold text-gray-900">
                  {report.fleet_summary.avg_consumption_per_100km.toFixed(1)}{" "}
                  <span className="text-sm font-normal text-gray-500">L/100km</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calculator className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Chi phí/km</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(Math.round(report.fleet_summary.avg_cost_per_km))}{" "}
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
        ) : !report || report.vehicles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Fuel className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có dữ liệu trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Biển số
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Quãng đường
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Nhiên liệu
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Chi phí
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Tiêu hao
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Chi phí/km
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Số lần đổ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.vehicles.map((vehicle) => (
                  <tr key={vehicle.vehicle_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                        {vehicle.vehicle_plate}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatNumber(vehicle.total_distance_km)} km
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {vehicle.total_fuel_liters.toFixed(1)} lít
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-red-600">
                        {formatNumber(vehicle.total_cost)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          vehicle.consumption_per_100km > 41
                            ? "bg-red-100 text-red-700"
                            : vehicle.consumption_per_100km > 35
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {vehicle.consumption_per_100km.toFixed(1)} L/100km
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {formatNumber(Math.round(vehicle.cost_per_km))} đ
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">{vehicle.fuel_log_count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      {report && report.vehicles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Chú giải mức tiêu hao nhiên liệu</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">
                  &le; 35 L/100km
                </span>
                <span>Tốt</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">
                  35-41 L/100km
                </span>
                <span>Trung bình</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">
                  &gt; 41 L/100km
                </span>
                <span>Cần kiểm tra</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
