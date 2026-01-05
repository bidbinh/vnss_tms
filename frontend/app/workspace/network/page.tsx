"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Bell,
  Search,
  TrendingUp,
  ArrowRight,
  Truck,
  Phone,
  DollarSign,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

interface ConnectionStats {
  connected_drivers: number;
  connected_dispatchers: number;
  pending_invitations: number;
  pending_requests: number;
  total_orders_completed: number;
  total_amount_paid: number;
  total_amount_pending: number;
}

export default function NetworkDashboard() {
  const { worker } = useWorker();
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (worker) {
      fetchStats();
    }
  }, [worker]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/worker-connections/stats`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!worker) return null;

  const totalPending =
    (stats?.pending_invitations || 0) + (stats?.pending_requests || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mạng lưới của tôi
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Quản lý kết nối với tài xế và điều phối viên
              </p>
            </div>
            <Link
              href="/workspace/network/search"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Tìm kết nối mới
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Pending Notifications */}
        {totalPending > 0 && (
          <Link
            href="/workspace/network/invitations"
            className="block bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-yellow-800">
                    Bạn có {totalPending} yêu cầu đang chờ xử lý
                  </p>
                  <p className="text-sm text-yellow-600">
                    {stats?.pending_invitations || 0} lời mời,{" "}
                    {stats?.pending_requests || 0} yêu cầu gia nhập
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-yellow-600" />
            </div>
          </Link>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/workspace/network/drivers"
            className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? "-" : stats?.connected_drivers || 0}
            </p>
            <p className="text-sm text-gray-500">Tài xế đã kết nối</p>
          </Link>

          <Link
            href="/workspace/network/dispatchers"
            className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? "-" : stats?.connected_dispatchers || 0}
            </p>
            <p className="text-sm text-gray-500">Điều phối viên</p>
          </Link>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? "-" : stats?.total_orders_completed || 0}
            </p>
            <p className="text-sm text-gray-500">Đơn hàng hoàn thành</p>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading
                ? "-"
                : (stats?.total_amount_pending || 0).toLocaleString("vi-VN")}
            </p>
            <p className="text-sm text-gray-500">Chưa thanh toán (VNĐ)</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* As Dispatcher */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Với vai trò Điều phối viên
            </h3>
            <div className="space-y-3">
              <Link
                href="/workspace/network/search?role=DRIVER"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
              >
                <Search className="w-5 h-5 text-gray-400" />
                <span>Tìm tài xế mới</span>
              </Link>
              <Link
                href="/workspace/dispatcher/orders"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
              >
                <TrendingUp className="w-5 h-5 text-gray-400" />
                <span>Quản lý đơn hàng của tôi</span>
              </Link>
              <Link
                href="/workspace/dispatcher/orders/new"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 bg-blue-50 border-blue-200"
              >
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span className="text-blue-700 font-medium">Tạo đơn hàng mới</span>
              </Link>
            </div>
          </div>

          {/* As Driver */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-green-600" />
              Với vai trò Tài xế
            </h3>
            <div className="space-y-3">
              <Link
                href="/workspace/network/search?role=DISPATCHER"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
              >
                <Search className="w-5 h-5 text-gray-400" />
                <span>Tìm điều phối viên</span>
              </Link>
              <Link
                href="/workspace/driver-work"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
              >
                <TrendingUp className="w-5 h-5 text-gray-400" />
                <span>Đơn hàng được giao</span>
              </Link>
              <Link
                href="/workspace/network/invitations"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50"
              >
                <Bell className="w-5 h-5 text-gray-400" />
                <span>Xem lời mời kết nối</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity - Placeholder */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Chưa có hoạt động nào</p>
            <p className="text-sm mt-1">
              Bắt đầu bằng cách tìm và kết nối với tài xế hoặc điều phối viên
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
