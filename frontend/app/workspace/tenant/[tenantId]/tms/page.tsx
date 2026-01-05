"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Package,
  Truck,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useWorkspaceApi } from "./layout";

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  inTransitOrders: number;
  completedOrders: number;
  activeDrivers: number;
  totalDrivers: number;
  totalVehicles: number;
}

export default function WorkspaceTmsDashboard() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { api, permissions, tenantInfo } = useWorkspaceApi();

  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    inTransitOrders: 0,
    completedOrders: 0,
    activeDrivers: 0,
    totalDrivers: 0,
    totalVehicles: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const basePath = `/workspace/tenant/${tenantId}/tms`;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch orders
      const ordersData = await api.getOrders({ limit: 100 });
      const orders = ordersData.orders || [];

      // Fetch drivers
      let drivers: any[] = [];
      try {
        const driversData = await api.getDrivers();
        drivers = driversData.drivers || [];
      } catch {}

      // Fetch vehicles
      let vehicles: any[] = [];
      try {
        const vehiclesData = await api.getVehicles();
        vehicles = vehiclesData.vehicles || [];
      } catch {}

      // Calculate stats
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter((o: any) => ["NEW", "ACCEPTED", "ASSIGNED"].includes(o.status)).length,
        inTransitOrders: orders.filter((o: any) => o.status === "IN_TRANSIT").length,
        completedOrders: orders.filter((o: any) => ["DELIVERED", "COMPLETED"].includes(o.status)).length,
        activeDrivers: drivers.filter((d: any) => d.status === "ACTIVE").length,
        totalDrivers: drivers.length,
        totalVehicles: vehicles.length,
      });

      // Recent orders (last 5)
      setRecentOrders(orders.slice(0, 5));
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW": return "bg-gray-100 text-gray-700";
      case "ACCEPTED": return "bg-blue-100 text-blue-700";
      case "ASSIGNED": return "bg-indigo-100 text-indigo-700";
      case "IN_TRANSIT": return "bg-yellow-100 text-yellow-700";
      case "DELIVERED": return "bg-green-100 text-green-700";
      case "COMPLETED": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "NEW": return "Mới";
      case "ACCEPTED": return "Đã nhận";
      case "ASSIGNED": return "Đã gán";
      case "IN_TRANSIT": return "Đang vận chuyển";
      case "DELIVERED": return "Đã giao";
      case "COMPLETED": return "Hoàn thành";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">TMS Dashboard</h1>
        <p className="text-gray-500">{tenantInfo?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <div className="text-sm text-gray-500">Tổng đơn hàng</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.pendingOrders}</div>
              <div className="text-sm text-gray-500">Chờ xử lý</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.inTransitOrders}</div>
              <div className="text-sm text-gray-500">Đang vận chuyển</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.completedOrders}</div>
              <div className="text-sm text-gray-500">Hoàn thành</div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {stats.activeDrivers} / {stats.totalDrivers}
                </div>
                <div className="text-sm text-gray-500">Tài xế hoạt động</div>
              </div>
            </div>
            <Link
              href={`${basePath}/drivers`}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">{stats.totalVehicles}</div>
                <div className="text-sm text-gray-500">Xe</div>
              </div>
            </div>
            <Link
              href={`${basePath}/vehicles`}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Đơn hàng gần đây</h2>
          <Link
            href={`${basePath}/orders`}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            Xem tất cả <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Chưa có đơn hàng nào</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`${basePath}/orders/${order.id}`}
                className="p-4 hover:bg-gray-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-blue-600">{order.order_code}</div>
                  <div className="text-sm text-gray-500">
                    {order.order_date
                      ? new Date(order.order_date).toLocaleDateString("vi-VN")
                      : "-"}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {permissions?.permissions?.orders?.includes("create") && (
          <Link
            href={`${basePath}/orders/new`}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 text-center"
          >
            <Package className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Tạo đơn mới</span>
          </Link>
        )}
        {permissions?.permissions?.orders?.includes("assign") && (
          <Link
            href={`${basePath}/dispatch`}
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 text-center"
          >
            <Truck className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Điều phối</span>
          </Link>
        )}
        <Link
          href={`${basePath}/orders`}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl p-4 text-center"
        >
          <Package className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Đơn hàng</span>
        </Link>
        <Link
          href={`${basePath}/drivers`}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl p-4 text-center"
        >
          <Users className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Tài xế</span>
        </Link>
      </div>
    </div>
  );
}
