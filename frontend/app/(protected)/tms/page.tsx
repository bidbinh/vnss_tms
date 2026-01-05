"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  tractors: { total: number; active: number; inactive: number };
  trailers: { total: number; active: number; inactive: number };
  drivers: { active: number };
  orders_today: { total: number; completed: number; in_progress: number };
  maintenance_cost_month: number;
}

interface Alert {
  schedule_id?: string;
  vehicle_id?: string;
  vehicle_plate: string;
  maintenance_type?: string;
  alert_type?: string;
  days_overdue?: number;
  days_until?: number;
  next_due_date?: string;
  registration_expiry?: string;
}

interface Alerts {
  maintenance_overdue: Alert[];
  maintenance_due_soon: Alert[];
  registration_expiring: Alert[];
  inactive_vehicles_count: number;
}

interface OrderTrendData {
  date: string;
  total: number;
  completed: number;
}

interface VehicleDistribution {
  type: string;
  active: number;
  inactive: number;
  total: number;
}

interface MaintenanceCost {
  maintenance_type: string;
  total_cost: number;
}

interface RecentOrder {
  id: string;
  created_at: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
}

interface RecentMaintenance {
  id: string;
  vehicle_plate: string;
  maintenance_type: string;
  service_date: string;
  total_cost: number;
}

interface RecentActivities {
  recent_orders: RecentOrder[];
  recent_maintenance: RecentMaintenance[];
}

interface TopVehicle {
  vehicle_id: string;
  vehicle_plate: string;
  total_cost: number;
}

interface TopVehicles {
  top_costly_maintenance: TopVehicle[];
}

// New interfaces for enhanced dashboard
interface FuelConsumption {
  period_30_days: {
    total_liters: number;
    total_amount: number;
    total_km: number;
    liters_per_100km: number;
  };
  top_consuming_vehicles: {
    vehicle_id: string;
    vehicle_plate: string;
    total_liters: number;
    liters_per_100km: number;
    last_7_consumption: number;
  }[];
  total_vehicles_with_fuel: number;
}

interface MaintenanceAvgCost {
  total_cost_6_months: number;
  avg_cost_per_vehicle: number;
  total_vehicles: number;
  vehicles_with_maintenance: number;
  monthly_breakdown: { month: string; cost: number }[];
}

interface TripStats {
  total_trips: number;
  total_active_drivers: number;
  avg_trips_per_driver: number;
  drivers_with_trips: number;
  top_drivers: { driver_id: string; driver_name: string; trip_count: number }[];
}

interface Revenue {
  period: { start_date: string; end_date: string };
  total_revenue: number;
  total_orders: number;
  avg_revenue_per_vehicle: number;
  avg_revenue_per_order: number;
  daily_breakdown: { date: string; revenue: number; orders: number }[];
}

interface Profit {
  period: { start_date: string; end_date: string };
  revenue: number;
  costs: { fuel: number; maintenance: number; total: number };
  gross_profit: number;
  net_profit: number;
  margins: { gross_margin_percent: number; net_margin_percent: number };
}

interface CustomerRevenue {
  period: { start_date: string; end_date: string };
  total_revenue: number;
  total_customers: number;
  distribution: { customer_id: string; customer_code: string; customer_name: string; revenue: number; order_count: number; percentage: number }[];
}

export default function TMSDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [orderTrend, setOrderTrend] = useState<OrderTrendData[]>([]);
  const [vehicleDist, setVehicleDist] = useState<VehicleDistribution[]>([]);
  const [maintenanceCost, setMaintenanceCost] = useState<MaintenanceCost[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivities | null>(null);
  const [topVehicles, setTopVehicles] = useState<TopVehicles | null>(null);

  // New states for enhanced dashboard
  const [fuelConsumption, setFuelConsumption] = useState<FuelConsumption | null>(null);
  const [maintenanceAvgCost, setMaintenanceAvgCost] = useState<MaintenanceAvgCost | null>(null);
  const [tripStats, setTripStats] = useState<TripStats | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [profit, setProfit] = useState<Profit | null>(null);
  const [customerRevenue, setCustomerRevenue] = useState<CustomerRevenue | null>(null);

  // Date range for revenue/profit
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchDashboardData();
    fetchEnhancedData();
  }, [router]);

  // Fetch revenue/profit when date range changes
  useEffect(() => {
    fetchRevenueData();
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("access_token");
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, alertsRes, trendRes, distRes, costRes, activitiesRes, topRes] =
        await Promise.all([
          fetch(`${baseURL}/dashboard/stats`, { headers }),
          fetch(`${baseURL}/dashboard/alerts`, { headers }),
          fetch(`${baseURL}/dashboard/charts/orders-trend?days=30`, { headers }),
          fetch(`${baseURL}/dashboard/charts/vehicle-distribution`, { headers }),
          fetch(`${baseURL}/dashboard/charts/maintenance-cost?months=3`, { headers }),
          fetch(`${baseURL}/dashboard/recent-activities?limit=10`, { headers }),
          fetch(`${baseURL}/dashboard/top-vehicles`, { headers }),
        ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (trendRes.ok) setOrderTrend(await trendRes.json());
      if (distRes.ok) setVehicleDist(await distRes.json());
      if (costRes.ok) setMaintenanceCost(await costRes.json());
      if (activitiesRes.ok) setRecentActivities(await activitiesRes.json());
      if (topRes.ok) setTopVehicles(await topRes.json());
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  const fetchEnhancedData = async () => {
    const token = localStorage.getItem("access_token");
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [fuelRes, maintAvgRes, tripRes] = await Promise.all([
        fetch(`${baseURL}/dashboard/fuel-consumption`, { headers }),
        fetch(`${baseURL}/dashboard/maintenance-avg-cost`, { headers }),
        fetch(`${baseURL}/dashboard/trip-stats`, { headers }),
      ]);

      if (fuelRes.ok) setFuelConsumption(await fuelRes.json());
      if (maintAvgRes.ok) setMaintenanceAvgCost(await maintAvgRes.json());
      if (tripRes.ok) setTripStats(await tripRes.json());
    } catch (error) {
      console.error("Failed to fetch enhanced data:", error);
    }
  };

  const fetchRevenueData = async () => {
    const token = localStorage.getItem("access_token");
    const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [revenueRes, profitRes, customerRes] = await Promise.all([
        fetch(`${baseURL}/dashboard/revenue?start_date=${startDate}&end_date=${endDate}`, { headers }),
        fetch(`${baseURL}/dashboard/profit?start_date=${startDate}&end_date=${endDate}`, { headers }),
        fetch(`${baseURL}/dashboard/customer-revenue?start_date=${startDate}&end_date=${endDate}`, { headers }),
      ]);

      if (revenueRes.ok) setRevenue(await revenueRes.json());
      if (profitRes.ok) setProfit(await profitRes.json());
      if (customerRes.ok) setCustomerRevenue(await customerRes.json());
    } catch (error) {
      console.error("Failed to fetch revenue data:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">TMS Dashboard - Quản Trị Vận Tải</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 whitespace-nowrap">Đầu kéo</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{stats.tractors.active}</div>
            <div className="mt-2 text-xs text-gray-500 whitespace-nowrap">
              Tổng: {stats.tractors.total} | Ngừng: {stats.tractors.inactive}
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 whitespace-nowrap">Rơ mooc</div>
            <div className="mt-2 text-3xl font-bold text-indigo-600">{stats.trailers.active}</div>
            <div className="mt-2 text-xs text-gray-500 whitespace-nowrap">
              Tổng: {stats.trailers.total} | Ngừng: {stats.trailers.inactive}
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 whitespace-nowrap">Tài xế</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{stats.drivers.active}</div>
            <div className="mt-2 text-xs text-gray-500 whitespace-nowrap">
              Đang hoạt động
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 whitespace-nowrap">Đơn hàng hôm nay</div>
            <div className="mt-2 text-3xl font-bold text-purple-600">{stats.orders_today.total}</div>
            <div className="mt-2 text-xs text-gray-500 whitespace-nowrap">
              HT: {stats.orders_today.completed} | XL: {stats.orders_today.in_progress}
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-600 whitespace-nowrap">Chi phí bảo trì đầu kéo</div>
            <div className="mt-2 text-3xl font-bold text-orange-600">
              {formatCurrency(stats.maintenance_cost_month)}
            </div>
            <div className="mt-2 text-xs text-gray-500">Tháng này</div>
          </div>
        </div>
      )}

      {/* Fuel Consumption & Maintenance Avg Cost Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Consumption */}
        {fuelConsumption && (
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Tiêu hao nhiên liệu (30 ngày)</h2>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-blue-600">{fuelConsumption.period_30_days.total_liters.toLocaleString()}</div>
                <div className="text-xs text-gray-600 whitespace-nowrap">Tổng (lít)</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-green-600">{fuelConsumption.period_30_days.total_km.toLocaleString()}</div>
                <div className="text-xs text-gray-600 whitespace-nowrap">Tổng km</div>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center">
                <div className="text-xl font-bold text-purple-600">{fuelConsumption.period_30_days.liters_per_100km}</div>
                <div className="text-xs text-gray-600 whitespace-nowrap">Lít/100km</div>
              </div>
            </div>

            {/* Top consuming vehicles - table format */}
            {fuelConsumption.top_consuming_vehicles && fuelConsumption.top_consuming_vehicles.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Top xe tiêu hao cao (lít/100km):</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="text-left py-2 font-medium">#</th>
                      <th className="text-left py-2 font-medium whitespace-nowrap">Biển số</th>
                      <th className="text-right py-2 font-medium whitespace-nowrap">30 ngày (lít)</th>
                      <th className="text-right py-2 font-medium whitespace-nowrap">30 ngày</th>
                      <th className="text-right py-2 font-medium whitespace-nowrap">7 lần</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelConsumption.top_consuming_vehicles.map((vehicle, idx) => (
                      <tr key={vehicle.vehicle_id} className="border-b border-gray-100">
                        <td className="py-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : 'bg-gray-400'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2 font-medium whitespace-nowrap">{vehicle.vehicle_plate}</td>
                        <td className="py-2 text-right text-blue-600 whitespace-nowrap">{vehicle.total_liters.toLocaleString()}</td>
                        <td className="py-2 text-right text-green-600 whitespace-nowrap">{vehicle.liters_per_100km}</td>
                        <td className="py-2 text-right text-orange-600 whitespace-nowrap">{vehicle.last_7_consumption}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Maintenance Average Cost */}
        {maintenanceAvgCost && (
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Chi phí sửa chữa trung bình (6 tháng)</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-sm text-gray-600">Tổng chi phí</div>
                <div className="text-xl font-bold text-orange-600">{formatCurrency(maintenanceAvgCost.total_cost_6_months)}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-sm text-gray-600">Trung bình/xe</div>
                <div className="text-xl font-bold text-purple-600">{formatCurrency(maintenanceAvgCost.avg_cost_per_vehicle)}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Tổng xe: {maintenanceAvgCost.total_vehicles} | Xe có bảo trì: {maintenanceAvgCost.vehicles_with_maintenance}
            </div>
            {maintenanceAvgCost.monthly_breakdown.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-sm font-medium text-gray-700">Chi phí theo tháng:</div>
                {maintenanceAvgCost.monthly_breakdown.map((item) => (
                  <div key={item.month} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.month}</span>
                    <span className="text-orange-600">{formatCurrency(item.cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trip Stats Section */}
      {tripStats && (
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Thống kê chuyến xe (30 ngày)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-indigo-50 p-3 rounded text-center">
              <div className="text-2xl font-bold text-indigo-600">{tripStats.total_trips}</div>
              <div className="text-sm text-gray-600">Tổng số chuyến</div>
            </div>
            <div className="bg-teal-50 p-3 rounded text-center">
              <div className="text-2xl font-bold text-teal-600">{tripStats.total_active_drivers}</div>
              <div className="text-sm text-gray-600">Tài xế hoạt động</div>
            </div>
            <div className="bg-cyan-50 p-3 rounded text-center">
              <div className="text-2xl font-bold text-cyan-600">{tripStats.avg_trips_per_driver}</div>
              <div className="text-sm text-gray-600">TB chuyến/tài xế</div>
            </div>
            <div className="bg-sky-50 p-3 rounded text-center">
              <div className="text-2xl font-bold text-sky-600">{tripStats.drivers_with_trips}</div>
              <div className="text-sm text-gray-600">Tài xế có chuyến</div>
            </div>
          </div>
          {tripStats.top_drivers.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Top tài xế:</div>
              <div className="space-y-1">
                {tripStats.top_drivers.map((driver, idx) => (
                  <div key={driver.driver_id} className="flex justify-between items-center text-sm py-1 border-b">
                    <span className="text-gray-600">#{idx + 1} {driver.driver_name}</span>
                    <span className="font-medium text-indigo-600">{driver.trip_count} chuyến</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revenue & Profit Section with Date Range */}
      <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">Doanh thu & Lợi nhuận</h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Revenue */}
          {revenue && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Doanh thu (Sau thuế)</div>
              <div className="bg-emerald-50 p-4 rounded">
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(revenue.total_revenue)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {revenue.total_orders} đơn hàng | TB/xe: {formatCurrency(revenue.avg_revenue_per_vehicle)}
                </div>
              </div>
            </div>
          )}

          {/* Gross Profit */}
          {profit && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Lợi nhuận gộp</div>
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(profit.gross_profit)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Biên lợi nhuận: {profit.margins.gross_margin_percent}%
                </div>
              </div>
            </div>
          )}

          {/* Net Profit */}
          {profit && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Lợi nhuận ròng</div>
              <div className={`p-4 rounded ${profit.net_profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`text-2xl font-bold ${profit.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profit.net_profit)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Biên lợi nhuận: {profit.margins.net_margin_percent}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        {profit && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium text-gray-700 mb-2">Chi phí trong kỳ:</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-600">Nhiên liệu</div>
                <div className="font-medium text-orange-600">{formatCurrency(profit.costs.fuel)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600">Bảo trì</div>
                <div className="font-medium text-purple-600">{formatCurrency(profit.costs.maintenance)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600">Tổng chi phí</div>
                <div className="font-medium text-red-600">{formatCurrency(profit.costs.total)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Revenue Distribution */}
      {customerRevenue && customerRevenue.distribution.length > 0 && (
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Tỷ trọng doanh số theo khách hàng</h2>
          <div className="text-sm text-gray-500 mb-4">
            Tổng: {formatCurrency(customerRevenue.total_revenue)} | {customerRevenue.total_customers} khách hàng
          </div>
          <div className="space-y-3">
            {customerRevenue.distribution.slice(0, 10).map((customer) => (
              <div key={customer.customer_id}>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium">{customer.customer_code} - {customer.customer_name}</span>
                  <span className="text-gray-600">{customer.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                    style={{ width: `${customer.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatCurrency(customer.revenue)}</span>
                  <span>{customer.order_count} đơn</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts && (
        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Cảnh báo</h2>
          <div className="space-y-4">
            {alerts.maintenance_overdue.length > 0 && (
              <div>
                <div className="text-sm font-medium text-red-700 mb-2">
                  Bảo trì quá hạn ({alerts.maintenance_overdue.length})
                </div>
                <div className="space-y-2">
                  {alerts.maintenance_overdue.map((alert, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                      <div className="font-medium">{alert.vehicle_plate}</div>
                      <div className="text-gray-600">
                        {alert.maintenance_type} - Quá hạn {alert.days_overdue} ngày
                      </div>
                      <div className="text-xs text-gray-500">
                        Hạn: {formatDate(alert.next_due_date || "")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.maintenance_due_soon.length > 0 && (
              <div>
                <div className="text-sm font-medium text-yellow-700 mb-2">
                  Bảo trì sắp đến hạn ({alerts.maintenance_due_soon.length})
                </div>
                <div className="space-y-2">
                  {alerts.maintenance_due_soon.map((alert, idx) => (
                    <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                      <div className="font-medium">{alert.vehicle_plate}</div>
                      <div className="text-gray-600">
                        {alert.maintenance_type} - Còn {alert.days_until} ngày
                      </div>
                      <div className="text-xs text-gray-500">
                        Hạn: {formatDate(alert.next_due_date || "")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.registration_expiring.length > 0 && (
              <div>
                <div className="text-sm font-medium text-orange-700 mb-2">
                  Đăng kiểm sắp hết hạn ({alerts.registration_expiring.length})
                </div>
                <div className="space-y-2">
                  {alerts.registration_expiring.map((alert, idx) => (
                    <div key={idx} className="bg-orange-50 border border-orange-200 rounded p-3 text-sm">
                      <div className="font-medium">{alert.vehicle_plate}</div>
                      <div className="text-gray-600">Còn {alert.days_until} ngày</div>
                      <div className="text-xs text-gray-500">
                        Hạn: {formatDate(alert.registration_expiry || "")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.inactive_vehicles_count > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
                <div className="font-medium text-gray-700">
                  Có {alerts.inactive_vehicles_count} phương tiện ngừng hoạt động
                </div>
              </div>
            )}

            {alerts.maintenance_overdue.length === 0 &&
              alerts.maintenance_due_soon.length === 0 &&
              alerts.registration_expiring.length === 0 &&
              alerts.inactive_vehicles_count === 0 && (
                <div className="text-gray-500 text-sm">Không có cảnh báo</div>
              )}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Trend */}
        {orderTrend.length > 0 && (
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Xu hướng đơn hàng (30 ngày)</h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {orderTrend.slice(-10).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-1 border-b">
                  <div className="text-gray-600">{formatDate(item.date)}</div>
                  <div className="flex gap-4">
                    <span className="text-blue-600">Tổng: {item.total}</span>
                    <span className="text-green-600">Hoàn thành: {item.completed}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicle Distribution */}
        {vehicleDist.length > 0 && (
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Phân bổ phương tiện theo loại</h2>
            <div className="space-y-3">
              {vehicleDist.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{item.type}</span>
                    <span className="text-gray-600">Tổng: {item.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(item.active / item.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Hoạt động: {item.active} | Ngừng: {item.inactive}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Maintenance Cost & Top Vehicles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Cost */}
        {maintenanceCost.length > 0 && (
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Chi phí bảo trì theo loại (3 tháng)</h2>
            <div className="space-y-2">
              {maintenanceCost.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-2 border-b">
                  <span className="font-medium">{item.maintenance_type}</span>
                  <span className="text-orange-600">{formatCurrency(item.total_cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Costly Vehicles */}
        {topVehicles && topVehicles.top_costly_maintenance.length > 0 && (
          <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Top xe chi phí bảo trì cao (tháng này)</h2>
            <div className="space-y-2">
              {topVehicles.top_costly_maintenance.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-2 border-b">
                  <span className="font-medium">{item.vehicle_plate}</span>
                  <span className="text-red-600">{formatCurrency(item.total_cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activities */}
      {recentActivities && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          {recentActivities.recent_orders.length > 0 && (
            <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Đơn hàng gần đây</h2>
              <div className="space-y-3">
                {recentActivities.recent_orders.map((order) => (
                  <div key={order.id} className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div className="text-sm">
                        <div className="font-medium text-gray-700">
                          {order.pickup_address} → {order.delivery_address}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          order.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Maintenance */}
          {recentActivities.recent_maintenance.length > 0 && (
            <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Bảo trì gần đây</h2>
              <div className="space-y-3">
                {recentActivities.recent_maintenance.map((maint) => (
                  <div key={maint.id} className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div className="text-sm">
                        <div className="font-medium text-gray-700">
                          {maint.vehicle_plate} - {maint.maintenance_type}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(maint.service_date)}
                        </div>
                      </div>
                      <span className="text-sm text-orange-600 font-medium">
                        {formatCurrency(maint.total_cost)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
