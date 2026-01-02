"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Truck,
  Route,
  DollarSign,
  Fuel,
  Wrench,
  Calculator,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ============================================================================
// TYPES
// ============================================================================

interface VehiclePLReport {
  vehicle_id: string;
  vehicle_plate: string;
  year: number | null;
  month: number | null;
  total_revenue: number;
  freight_revenue: number;
  other_revenue: number;
  fuel_cost: number;
  driver_salary: number;
  toll_cost: number;
  empty_return_cost: number;
  maintenance_cost: number;
  other_direct_cost: number;
  depreciation: number;
  insurance: number;
  registration: number;
  road_tax: number;
  gps_fee: number;
  loan_interest: number;
  other_indirect_cost: number;
  total_direct_cost: number;
  total_indirect_cost: number;
  total_cost: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  trip_count: number;
  total_km: number;
  revenue_per_km: number;
  cost_per_km: number;
}

interface RoutePLReport {
  route_name: string;
  route_code: string;
  year: number | null;
  month: number | null;
  trip_count: number;
  total_km: number;
  avg_km: number;
  total_revenue: number;
  avg_revenue_per_trip: number;
  total_cost: number;
  avg_cost_per_trip: number;
  total_profit: number;
  avg_profit_per_trip: number;
  profit_margin: number;
  avg_fuel_cost: number;
  avg_toll_cost: number;
  avg_other_cost: number;
  listed_rate: number | null;
  rate_variance: number | null;
}

interface Vehicle {
  id: string;
  plate_no: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PLReportsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"vehicle" | "route">("vehicle");

  // Data states
  const [vehicleReports, setVehicleReports] = useState<VehiclePLReport[]>([]);
  const [routeReports, setRouteReports] = useState<RoutePLReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states - mặc định toàn thời gian
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [filterVehicle, setFilterVehicle] = useState<string>("");

  // Expanded rows
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());

  // Fetch data
  const fetchVehiclePL = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterYear) params.append("year", String(filterYear));
      if (filterMonth) params.append("month", String(filterMonth));
      if (filterVehicle) params.append("vehicle_id", filterVehicle);
      const url = `/vehicle-costs/report/vehicle-pl${params.toString() ? `?${params}` : ""}`;
      const data = await apiFetch<VehiclePLReport[]>(url);
      setVehicleReports(data);
    } catch (err) {
      console.error("Failed to fetch vehicle P&L:", err);
    }
  }, [filterYear, filterMonth, filterVehicle]);

  const fetchRoutePL = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterYear) params.append("year", String(filterYear));
      if (filterMonth) params.append("month", String(filterMonth));
      const url = `/vehicle-costs/report/route-pl${params.toString() ? `?${params}` : ""}`;
      const data = await apiFetch<RoutePLReport[]>(url);
      setRouteReports(data);
    } catch (err) {
      console.error("Failed to fetch route P&L:", err);
    }
  }, [filterYear, filterMonth]);

  const fetchVehicles = useCallback(async () => {
    try {
      const data = await apiFetch<Vehicle[]>("/vehicles");
      setVehicles(data);
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      activeTab === "vehicle" ? fetchVehiclePL() : fetchRoutePL(),
    ]);
    setIsLoading(false);
  }, [activeTab, fetchVehiclePL, fetchRoutePL]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle expanded row
  const toggleExpand = (vehicleId: string) => {
    setExpandedVehicles((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }
      return next;
    });
  };

  // Calculate summary
  const vehicleSummary = vehicleReports.reduce(
    (acc, r) => ({
      totalRevenue: acc.totalRevenue + r.total_revenue,
      totalCost: acc.totalCost + r.total_cost,
      totalProfit: acc.totalProfit + r.net_profit,
      tripCount: acc.tripCount + r.trip_count,
      totalKm: acc.totalKm + r.total_km,
    }),
    { totalRevenue: 0, totalCost: 0, totalProfit: 0, tripCount: 0, totalKm: 0 }
  );

  const routeSummary = routeReports.reduce(
    (acc, r) => ({
      totalRevenue: acc.totalRevenue + r.total_revenue,
      totalCost: acc.totalCost + r.total_cost,
      totalProfit: acc.totalProfit + r.total_profit,
      tripCount: acc.tripCount + r.trip_count,
    }),
    { totalRevenue: 0, totalCost: 0, totalProfit: 0, tripCount: 0 }
  );

  const formatNumber = (n: number) => Math.round(n).toLocaleString("vi-VN");
  const formatPercent = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-purple-600" />
            Báo cáo Lợi nhuận (P&L)
          </h1>
          <p className="text-gray-600 mt-1">
            Phân tích doanh thu, chi phí và lợi nhuận theo xe và tuyến đường
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
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
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Truck className="w-4 h-4" />
              Theo Xe
            </button>
            <button
              onClick={() => setActiveTab("route")}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                activeTab === "route"
                  ? "bg-purple-600 text-white"
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
            onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tất cả năm</option>
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>

          {/* Month */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tất cả tháng</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>

          {/* Vehicle filter (only for vehicle tab) */}
          {activeTab === "vehicle" && (
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Tất cả xe</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_no}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng Doanh thu</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(
                  activeTab === "vehicle" ? vehicleSummary.totalRevenue : routeSummary.totalRevenue
                )}{" "}
                <span className="text-sm font-normal text-gray-500">đ</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Calculator className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng Chi phí</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(
                  activeTab === "vehicle" ? vehicleSummary.totalCost : routeSummary.totalCost
                )}{" "}
                <span className="text-sm font-normal text-gray-500">đ</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                (activeTab === "vehicle" ? vehicleSummary.totalProfit : routeSummary.totalProfit) >= 0
                  ? "bg-blue-100"
                  : "bg-orange-100"
              }`}
            >
              {(activeTab === "vehicle" ? vehicleSummary.totalProfit : routeSummary.totalProfit) >= 0 ? (
                <TrendingUp className="w-5 h-5 text-blue-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-orange-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Lợi nhuận ròng</p>
              <p
                className={`text-xl font-bold ${
                  (activeTab === "vehicle" ? vehicleSummary.totalProfit : routeSummary.totalProfit) >= 0
                    ? "text-blue-600"
                    : "text-orange-600"
                }`}
              >
                {formatNumber(
                  activeTab === "vehicle" ? vehicleSummary.totalProfit : routeSummary.totalProfit
                )}{" "}
                <span className="text-sm font-normal text-gray-500">đ</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Số chuyến</p>
              <p className="text-xl font-bold text-gray-900">
                {activeTab === "vehicle" ? vehicleSummary.tripCount : routeSummary.tripCount}
                {activeTab === "vehicle" && vehicleSummary.totalKm > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({formatNumber(vehicleSummary.totalKm)} km)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-400" />
            Đang tải dữ liệu...
          </div>
        ) : activeTab === "vehicle" ? (
          // Vehicle P&L Table
          vehicleReports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Không có dữ liệu P&L cho tháng này</p>
              <p className="text-sm mt-1">Hãy đảm bảo có trips và chi phí được ghi nhận</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Xe
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Chuyến
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Doanh thu
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Chi phí
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Lợi nhuận
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Biên LN
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      DT/km
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-10">

                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vehicleReports.map((report) => {
                    const isExpanded = expandedVehicles.has(report.vehicle_id);
                    const isProfitable = report.net_profit >= 0;

                    return (
                      <Fragment key={report.vehicle_id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleExpand(report.vehicle_id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                                {report.vehicle_plate}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium">{report.trip_count}</span>
                            <span className="text-xs text-gray-500 block">
                              {formatNumber(report.total_km)} km
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-green-600">
                              {formatNumber(report.total_revenue)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-red-600">
                              {formatNumber(report.total_cost)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-bold ${
                                isProfitable ? "text-blue-600" : "text-orange-600"
                              }`}
                            >
                              {formatNumber(report.net_profit)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                report.profit_margin >= 20
                                  ? "bg-green-100 text-green-700"
                                  : report.profit_margin >= 10
                                  ? "bg-blue-100 text-blue-700"
                                  : report.profit_margin >= 0
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {formatPercent(report.profit_margin)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {formatNumber(report.revenue_per_km)} đ
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </td>
                        </tr>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="grid grid-cols-3 gap-6">
                                {/* Doanh thu */}
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    Doanh thu
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Cước vận chuyển:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.freight_revenue)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Thu nhập khác:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.other_revenue)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t font-semibold">
                                      <span>Tổng doanh thu:</span>
                                      <span className="text-green-600">
                                        {formatNumber(report.total_revenue)} đ
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Chi phí trực tiếp */}
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Fuel className="w-4 h-4 text-orange-600" />
                                    Chi phí trực tiếp
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Nhiên liệu:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.fuel_cost)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Cầu đường:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.toll_cost)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Hạ rỗng:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.empty_return_cost)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Bảo dưỡng:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.maintenance_cost)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Khác:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.other_direct_cost)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t font-semibold">
                                      <span>Tổng CP trực tiếp:</span>
                                      <span className="text-orange-600">
                                        {formatNumber(report.total_direct_cost)} đ
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Chi phí gián tiếp */}
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Wrench className="w-4 h-4 text-purple-600" />
                                    Chi phí gián tiếp (phân bổ)
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Khấu hao:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.depreciation)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Bảo hiểm:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.insurance)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Đăng kiểm:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.registration)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">GPS:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.gps_fee)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Khác:</span>
                                      <span className="font-medium">
                                        {formatNumber(report.other_indirect_cost)} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t font-semibold">
                                      <span>Tổng CP gián tiếp:</span>
                                      <span className="text-purple-600">
                                        {formatNumber(report.total_indirect_cost)} đ
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Summary row */}
                              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                <div className="flex items-center gap-6 text-sm">
                                  <div>
                                    <span className="text-gray-500">Lợi nhuận gộp:</span>
                                    <span className="ml-2 font-semibold text-blue-600">
                                      {formatNumber(report.gross_profit)} đ
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Chi phí/km:</span>
                                    <span className="ml-2 font-semibold">
                                      {formatNumber(report.cost_per_km)} đ
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // Route P&L Table
          routeReports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Route className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Không có dữ liệu P&L theo tuyến cho tháng này</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tuyến đường
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Chuyến
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      TB km
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Tổng DT
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      TB DT/chuyến
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      TB CP/chuyến
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      TB LN/chuyến
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Biên LN
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {routeReports.map((report, idx) => {
                    const isProfitable = report.profit_margin >= 0;

                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {report.route_code || report.route_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium">{report.trip_count}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {formatNumber(report.avg_km)} km
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-green-600">
                            {formatNumber(report.total_revenue)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {formatNumber(report.avg_revenue_per_trip)} đ
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-red-600">
                          {formatNumber(report.avg_cost_per_trip)} đ
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-semibold ${
                              isProfitable ? "text-blue-600" : "text-orange-600"
                            }`}
                          >
                            {formatNumber(report.avg_profit_per_trip)} đ
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              report.profit_margin >= 20
                                ? "bg-green-100 text-green-700"
                                : report.profit_margin >= 10
                                ? "bg-blue-100 text-blue-700"
                                : report.profit_margin >= 0
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {formatPercent(report.profit_margin)}
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
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Hướng dẫn sử dụng báo cáo P&L</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>
              <strong>Theo Xe:</strong> Xem chi tiết doanh thu, chi phí trực tiếp (nhiên liệu, cầu
              đường...) và chi phí gián tiếp (khấu hao, bảo hiểm...) cho từng xe
            </li>
            <li>
              <strong>Theo Tuyến:</strong> So sánh hiệu quả kinh doanh của các tuyến đường để điều
              chỉnh giá cước phù hợp
            </li>
            <li>
              Nhấn vào dòng xe để xem chi tiết breakdown chi phí
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
