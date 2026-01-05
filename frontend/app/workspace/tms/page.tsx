"use client";

import { useState, useEffect } from "react";
import { Package, Users, Truck, TrendingUp, Building2 } from "lucide-react";
import { useAggregatedApi } from "./layout";

export default function WorkspaceTmsDashboard() {
  const { tenants, selectedTenantIds, fetchOrders, fetchDrivers, fetchVehicles, loading } = useAggregatedApi();
  const [stats, setStats] = useState({
    totalOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    totalDrivers: 0,
    totalVehicles: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (loading) return;

      setDataLoading(true);
      try {
        const [ordersData, driversData, vehiclesData] = await Promise.all([
          fetchOrders({ limit: 500 }),
          fetchDrivers(),
          fetchVehicles(),
        ]);

        const orders = ordersData.orders || [];
        const processing = orders.filter((o: any) =>
          ["NEW", "ASSIGNED", "IN_TRANSIT"].includes(o.status)
        ).length;
        const completed = orders.filter((o: any) =>
          ["DELIVERED", "COMPLETED"].includes(o.status)
        ).length;

        setStats({
          totalOrders: orders.length,
          processingOrders: processing,
          completedOrders: completed,
          totalDrivers: (driversData.drivers || []).length,
          totalVehicles: (vehiclesData.vehicles || []).length,
        });
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setDataLoading(false);
      }
    };

    loadStats();
  }, [loading, selectedTenantIds]);

  if (loading || dataLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workspace TMS Dashboard</h1>
        <p className="text-gray-500">
          Tổng hợp dữ liệu từ {selectedTenantIds.length} công ty
        </p>
      </div>

      {/* Connected Tenants */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Công ty đang kết nối</h2>
        <div className="flex flex-wrap gap-2">
          {tenants
            .filter((t) => selectedTenantIds.includes(t.id))
            .map((tenant) => (
              <div
                key={tenant.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm"
              >
                <Building2 className="w-4 h-4" />
                {tenant.name}
              </div>
            ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng đơn hàng</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Đang xử lý</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.processingOrders}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Hoàn thành</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tài xế</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalDrivers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Xe</p>
              <p className="text-2xl font-bold text-orange-600">{stats.totalVehicles}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
