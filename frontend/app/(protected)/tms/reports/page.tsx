"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

function ReportsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as "fuel" | "revenue" | "driver-salary" | "maintenance" | null;
  const [activeTab, setActiveTab] = useState<"fuel" | "revenue" | "driver-salary" | "maintenance">(tabParam || "fuel");

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const tabs = [
    { id: "fuel" as const, label: "Báo cáo xăng dầu", icon: "⛽" },
    { id: "revenue" as const, label: "Báo cáo cước vận chuyển", icon: "💰" },
    { id: "driver-salary" as const, label: "Báo cáo lương tài xế", icon: "👤" },
    { id: "maintenance" as const, label: "Báo cáo bảo trì", icon: "🔧" },
  ];

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Báo cáo tổng hợp</h1>
        <p className="text-sm text-gray-600">Xem các báo cáo chi tiết về hoạt động kinh doanh</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "fuel" && <FuelReportTab />}
        {activeTab === "revenue" && <RevenueReportTab />}
        {activeTab === "driver-salary" && <DriverSalaryReportTab />}
        {activeTab === "maintenance" && <MaintenanceReportTab />}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6">Đang tải...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

// Fuel Report Tab Component
function FuelReportTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [report, setReport] = useState<ConsumptionReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedVehicle, startDate, endDate]);

  async function fetchVehicles() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      const data = await res.json();
      setVehicles(data);
    } catch (err: any) {
      console.error("Error fetching vehicles:", err);
    }
  }

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedVehicle) params.append("vehicle_id", selectedVehicle);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/fuel-reports/consumption?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatNumber(num: number): string {
    return num.toLocaleString("vi-VN");
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Xe</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full text-sm border rounded px-3 py-2"
            >
              <option value="">Tất cả xe</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_no}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-sm border rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-500">Đang tải...</div>}

      {report && !loading && (
        <>
          {/* Fleet Summary */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3">Tổng quan toàn bộ xe</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded bg-blue-50">
                <div className="text-sm text-gray-600">Tổng số xe</div>
                <div className="text-2xl font-bold">{report.fleet_summary.total_vehicles}</div>
              </div>

              <div className="p-4 border rounded bg-green-50">
                <div className="text-sm text-gray-600">Tổng quãng đường (km)</div>
                <div className="text-2xl font-bold">
                  {formatNumber(report.fleet_summary.total_distance_km)}
                </div>
              </div>

              <div className="p-4 border rounded bg-yellow-50">
                <div className="text-sm text-gray-600">Tổng xăng dầu (lít)</div>
                <div className="text-2xl font-bold">
                  {formatNumber(report.fleet_summary.total_fuel_liters)}
                </div>
              </div>

              <div className="p-4 border rounded bg-purple-50">
                <div className="text-sm text-gray-600">Tổng chi phí (VND)</div>
                <div className="text-2xl font-bold">
                  {formatNumber(report.fleet_summary.total_cost)}
                </div>
              </div>

              <div className="p-4 border rounded bg-orange-50">
                <div className="text-sm text-gray-600">TB tiêu hao (lít/100km)</div>
                <div className="text-2xl font-bold">
                  {report.fleet_summary.avg_consumption_per_100km.toFixed(2)}
                </div>
              </div>

              <div className="p-4 border rounded bg-red-50">
                <div className="text-sm text-gray-600">TB chi phí (VND/km)</div>
                <div className="text-2xl font-bold">
                  {formatNumber(Math.round(report.fleet_summary.avg_cost_per_km))}
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          {report.vehicles.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3">Chi tiết từng xe</h2>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Biển số</th>
                      <th className="px-4 py-2 text-right">Quãng đường (km)</th>
                      <th className="px-4 py-2 text-right">Xăng dầu (lít)</th>
                      <th className="px-4 py-2 text-right">Chi phí (VND)</th>
                      <th className="px-4 py-2 text-right">Tiêu hao (lít/100km)</th>
                      <th className="px-4 py-2 text-right">Chi phí (VND/km)</th>
                      <th className="px-4 py-2 text-center">Số lần đổ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.vehicles.map((vehicle) => (
                      <tr key={vehicle.vehicle_id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{vehicle.vehicle_plate}</td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(vehicle.total_distance_km)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {vehicle.total_fuel_liters.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(vehicle.total_cost)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`px-2 py-1 rounded ${
                              vehicle.consumption_per_100km > 41
                                ? "bg-red-100 text-red-800"
                                : vehicle.consumption_per_100km > 35
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {vehicle.consumption_per_100km.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {formatNumber(Math.round(vehicle.cost_per_km))}
                        </td>
                        <td className="px-4 py-2 text-center">{vehicle.fuel_log_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-4 text-xs text-gray-600">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                      ≤ 35 lít/100km
                    </span>
                    <span>Tốt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                      35-41 lít/100km
                    </span>
                    <span>Trung bình</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-red-100 text-red-800">
                      &gt; 41 lít/100km
                    </span>
                    <span>Cần kiểm tra</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {report.vehicles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Không có dữ liệu trong khoảng thời gian này
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Revenue Report Tab Component
function RevenueReportTab() {
  return (
    <div>
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-bold mb-4">Báo cáo cước vận chuyển</h2>
        <p className="text-sm text-gray-600 mb-6">
          Thống kê doanh thu từ các chuyến xe, phân tích theo tuyến đường, khách hàng, loại hàng hóa
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Tổng doanh thu</div>
            <div className="text-2xl font-bold text-blue-900">0 VND</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Số chuyến</div>
            <div className="text-2xl font-bold text-green-900">0</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Cước TB/chuyến</div>
            <div className="text-2xl font-bold text-purple-900">0 VND</div>
          </div>
        </div>

        <div className="text-center py-8 text-gray-400">
          <p>Chức năng đang được phát triển</p>
          <p className="text-sm mt-2">
            Sẽ bao gồm: Doanh thu theo tháng, theo tuyến, theo khách hàng, phân tích xu hướng
          </p>
        </div>
      </div>
    </div>
  );
}

// Driver Salary Report Tab Component
function DriverSalaryReportTab() {
  return (
    <div>
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-bold mb-4">Báo cáo lương tài xế</h2>
        <p className="text-sm text-gray-600 mb-6">
          Thống kê lương tài xế theo tháng, bao gồm lương cơ bản, phụ cấp, thưởng, số chuyến xe
        </p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Tổng lương</div>
            <div className="text-2xl font-bold text-orange-900">0 VND</div>
          </div>
          <div className="p-4 bg-teal-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Số tài xế</div>
            <div className="text-2xl font-bold text-teal-900">0</div>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Lương TB</div>
            <div className="text-2xl font-bold text-indigo-900">0 VND</div>
          </div>
          <div className="p-4 bg-pink-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Phụ cấp & thưởng</div>
            <div className="text-2xl font-bold text-pink-900">0 VND</div>
          </div>
        </div>

        <div className="text-center py-8 text-gray-400">
          <p>Chức năng đang được phát triển</p>
          <p className="text-sm mt-2">
            Sẽ bao gồm: Lương cơ bản, phụ cấp xăng xe, thưởng hiệu suất, tổng thu nhập, bảng lương chi tiết
          </p>
        </div>
      </div>
    </div>
  );
}

// Maintenance Report Tab Component
function MaintenanceReportTab() {
  return (
    <div>
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-bold mb-4">Báo cáo bảo trì bảo dưỡng</h2>
        <p className="text-sm text-gray-600 mb-6">
          Thống kê chi phí bảo trì, bảo dưỡng định kỳ, sửa chữa đột xuất theo từng xe
        </p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Tổng chi phí</div>
            <div className="text-2xl font-bold text-red-900">0 VND</div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Bảo dưỡng định kỳ</div>
            <div className="text-2xl font-bold text-yellow-900">0</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Sửa chữa đột xuất</div>
            <div className="text-2xl font-bold text-orange-900">0</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Chi phí TB/xe</div>
            <div className="text-2xl font-bold text-gray-900">0 VND</div>
          </div>
        </div>

        <div className="text-center py-8 text-gray-400">
          <p>Chức năng đang được phát triển</p>
          <p className="text-sm mt-2">
            Sẽ bao gồm: Chi phí bảo trì theo xe, theo tháng, loại bảo trì, nhà cung cấp, dự báo bảo trì
          </p>
        </div>
      </div>
    </div>
  );
}
