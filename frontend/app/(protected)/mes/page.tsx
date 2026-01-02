"use client";

import { useState, useEffect } from "react";
import {
  Factory,
  Boxes,
  Cog,
  ClipboardList,
  Hammer,
  CheckCircle,
  Wrench,
  TrendingUp,
  Clock,
  AlertTriangle,
  Play,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  production_orders: {
    total: number;
    in_progress: number;
    completed_today: number;
    delayed: number;
  };
  work_orders: {
    total: number;
    in_progress: number;
    pending: number;
    completed: number;
  };
  workstations: {
    total: number;
    active: number;
    maintenance: number;
    idle: number;
  };
  quality: {
    pass_rate: number;
    checks_today: number;
    failed_today: number;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function MESPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    production_orders: { total: 0, in_progress: 0, completed_today: 0, delayed: 0 },
    work_orders: { total: 0, in_progress: 0, pending: 0, completed: 0 },
    workstations: { total: 0, active: 0, maintenance: 0, idle: 0 },
    quality: { pass_rate: 0, checks_today: 0, failed_today: 0 },
  });

  useEffect(() => {
    // Simulated data for now - in real app, fetch from API
    setTimeout(() => {
      setStats({
        production_orders: { total: 45, in_progress: 12, completed_today: 8, delayed: 2 },
        work_orders: { total: 156, in_progress: 34, pending: 28, completed: 94 },
        workstations: { total: 24, active: 18, maintenance: 3, idle: 3 },
        quality: { pass_rate: 96.5, checks_today: 45, failed_today: 2 },
      });
      setLoading(false);
    }, 500);
  }, []);

  const quickLinks = [
    { label: "Định mức NVL (BOM)", href: "/mes/bom", icon: Boxes, color: "blue" },
    { label: "Trạm làm việc", href: "/mes/workstations", icon: Cog, color: "purple" },
    { label: "Quy trình SX", href: "/mes/routings", icon: TrendingUp, color: "green" },
    { label: "Lệnh sản xuất", href: "/mes/production-orders", icon: ClipboardList, color: "orange" },
    { label: "Lệnh công việc", href: "/mes/work-orders", icon: Hammer, color: "indigo" },
    { label: "Kiểm tra CL", href: "/mes/quality", icon: CheckCircle, color: "teal" },
    { label: "Bảo trì thiết bị", href: "/mes/maintenance", icon: Wrench, color: "red" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MES - Quản lý Sản xuất</h1>
          <p className="text-gray-500">Manufacturing Execution System</p>
        </div>
        <Link
          href="/mes/production-orders"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Play className="w-4 h-4" />
          Tạo lệnh sản xuất
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Production Orders */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-xs text-gray-500">Lệnh sản xuất</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Đang sản xuất</span>
              <span className="font-semibold text-orange-600">{stats.production_orders.in_progress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Hoàn thành hôm nay</span>
              <span className="font-semibold text-green-600">{stats.production_orders.completed_today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Chậm tiến độ</span>
              <span className="font-semibold text-red-600">{stats.production_orders.delayed}</span>
            </div>
          </div>
        </div>

        {/* Work Orders */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Hammer className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs text-gray-500">Lệnh công việc</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Đang thực hiện</span>
              <span className="font-semibold text-indigo-600">{stats.work_orders.in_progress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Chờ thực hiện</span>
              <span className="font-semibold text-yellow-600">{stats.work_orders.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Đã hoàn thành</span>
              <span className="font-semibold text-green-600">{stats.work_orders.completed}</span>
            </div>
          </div>
        </div>

        {/* Workstations */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Cog className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500">Trạm làm việc</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Đang hoạt động</span>
              <span className="font-semibold text-green-600">{stats.workstations.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Đang bảo trì</span>
              <span className="font-semibold text-orange-600">{stats.workstations.maintenance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Nhàn rỗi</span>
              <span className="font-semibold text-gray-600">{stats.workstations.idle}</span>
            </div>
          </div>
        </div>

        {/* Quality */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-teal-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-xs text-gray-500">Chất lượng</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tỷ lệ đạt</span>
              <span className="font-semibold text-green-600">{stats.quality.pass_rate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Kiểm tra hôm nay</span>
              <span className="font-semibold">{stats.quality.checks_today}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Không đạt</span>
              <span className="font-semibold text-red-600">{stats.quality.failed_today}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Truy cập nhanh</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center p-4 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className={`p-3 bg-${link.color}-100 rounded-lg mb-2`}>
                  <Icon className={`w-6 h-6 text-${link.color}-600`} />
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Production Orders */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Lệnh sản xuất gần đây</h2>
            <Link href="/mes/production-orders" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { number: "MO2412-0045", product: "Sản phẩm A", status: "IN_PROGRESS", progress: 75 },
              { number: "MO2412-0044", product: "Sản phẩm B", status: "RELEASED", progress: 0 },
              { number: "MO2412-0043", product: "Sản phẩm C", status: "COMPLETED", progress: 100 },
            ].map((order) => (
              <div key={order.number} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-600">{order.number}</p>
                  <p className="text-sm text-gray-500">{order.product}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        order.progress === 100 ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${order.progress}%` }}
                    />
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      order.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : order.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {order.status === "COMPLETED" ? "Hoàn thành" : order.status === "IN_PROGRESS" ? "Đang SX" : "Sẵn sàng"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workstation Status */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Trạng thái trạm làm việc</h2>
            <Link href="/mes/workstations" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { code: "WS-001", name: "Máy CNC #1", status: "ACTIVE", efficiency: 95 },
              { code: "WS-002", name: "Máy dập #2", status: "ACTIVE", efficiency: 88 },
              { code: "WS-003", name: "Máy hàn #1", status: "MAINTENANCE", efficiency: 0 },
              { code: "WS-004", name: "Dây chuyền lắp ráp", status: "ACTIVE", efficiency: 92 },
            ].map((ws) => (
              <div key={ws.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      ws.status === "ACTIVE" ? "bg-green-500" : "bg-orange-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium">{ws.name}</p>
                    <p className="text-xs text-gray-500">{ws.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  {ws.status === "ACTIVE" ? (
                    <p className="text-sm font-medium text-green-600">{ws.efficiency}% hiệu suất</p>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                      Đang bảo trì
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
