"use client";

import { useState, useEffect } from "react";
import {
  Package,
  FileText,
  Users,
  TrendingUp,
  Ship,
  Plane,
  Truck,
  Clock,
  DollarSign,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  totalShipments: number;
  activeShipments: number;
  pendingQuotations: number;
  totalAgents: number;
  seaFreight: number;
  airFreight: number;
  recentShipments: any[];
  monthlyRevenue: number;
  monthlyProfit: number;
}

export default function FMSDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    activeShipments: 0,
    pendingQuotations: 0,
    totalAgents: 0,
    seaFreight: 0,
    airFreight: 0,
    recentShipments: [],
    monthlyRevenue: 0,
    monthlyProfit: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch shipments stats
      const shipmentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/shipments/stats`,
        { headers }
      );

      // Fetch quotations
      const quotationsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/quotations?status=DRAFT&page_size=5`,
        { headers }
      );

      // Fetch agents
      const agentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/fms/agents?page_size=1`,
        { headers }
      );

      if (shipmentsRes.ok) {
        const shipmentsData = await shipmentsRes.json();
        setStats(prev => ({
          ...prev,
          totalShipments: shipmentsData.total || 0,
          activeShipments: shipmentsData.active || 0,
          seaFreight: shipmentsData.by_mode?.SEA_FCL || 0 + (shipmentsData.by_mode?.SEA_LCL || 0),
          airFreight: shipmentsData.by_mode?.AIR || 0,
        }));
      }

      if (quotationsRes.ok) {
        const quotationsData = await quotationsRes.json();
        setStats(prev => ({
          ...prev,
          pendingQuotations: quotationsData.total || 0,
        }));
      }

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setStats(prev => ({
          ...prev,
          totalAgents: agentsData.total || 0,
        }));
      }

    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle
  }: {
    title: string;
    value: number | string;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tổng quan FMS</h1>
          <p className="text-gray-600">Hệ thống quản lý giao nhận vận tải</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng lô hàng"
          value={stats.totalShipments}
          icon={Package}
          color="bg-blue-500"
          subtitle="Tất cả thời gian"
        />
        <StatCard
          title="Đang vận chuyển"
          value={stats.activeShipments}
          icon={Truck}
          color="bg-green-500"
          subtitle="Đang trên đường"
        />
        <StatCard
          title="Báo giá chờ duyệt"
          value={stats.pendingQuotations}
          icon={FileText}
          color="bg-yellow-500"
          subtitle="Chờ phản hồi"
        />
        <StatCard
          title="Đối tác/Đại lý"
          value={stats.totalAgents}
          icon={Users}
          color="bg-purple-500"
          subtitle="Đại lý đang hoạt động"
        />
      </div>

      {/* Mode Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Ship className="w-5 h-5 text-blue-600" />
            Vận tải đường biển
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Lô hàng FCL</span>
              <span className="font-semibold">{stats.seaFreight}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ghép hàng LCL</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Chờ thông quan</span>
              <span className="font-semibold text-orange-600">0</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plane className="w-5 h-5 text-purple-600" />
            Vận tải hàng không
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Lô hàng Air</span>
              <span className="font-semibold">{stats.airFreight}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ghép hàng Air</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Chờ AWB</span>
              <span className="font-semibold text-orange-600">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/fms/shipments?action=new"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <Package className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Tạo lô hàng mới</span>
          </a>
          <a
            href="/fms/quotations?action=new"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <FileText className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm font-medium">Tạo báo giá</span>
          </a>
          <a
            href="/fms/customs"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <AlertCircle className="w-8 h-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium">Tờ khai hải quan</span>
          </a>
          <a
            href="/fms/tracking"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            <Clock className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium">Theo dõi lô hàng</span>
          </a>
        </div>
      </div>

      {/* Recent Shipments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Lô hàng gần đây</h3>
          <a href="/fms/shipments" className="text-blue-600 hover:underline text-sm">
            Xem tất cả
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-600 border-b">
                <th className="pb-3 font-medium">Mã lô hàng</th>
                <th className="pb-3 font-medium">Loại</th>
                <th className="pb-3 font-medium">Tuyến đường</th>
                <th className="pb-3 font-medium">Trạng thái</th>
                <th className="pb-3 font-medium">Ngày khởi hành</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentShipments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Chưa có lô hàng nào. Tạo lô hàng đầu tiên để bắt đầu.
                  </td>
                </tr>
              ) : (
                stats.recentShipments.map((shipment: any) => (
                  <tr key={shipment.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      <a href={`/fms/shipments/${shipment.id}`} className="text-blue-600 hover:underline">
                        {shipment.shipment_no}
                      </a>
                    </td>
                    <td className="py-3">{shipment.shipment_mode}</td>
                    <td className="py-3">
                      {shipment.origin_port} → {shipment.destination_port}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        shipment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        shipment.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {shipment.status === 'COMPLETED' ? 'Hoàn thành' :
                         shipment.status === 'IN_TRANSIT' ? 'Đang vận chuyển' :
                         shipment.status === 'DRAFT' ? 'Nháp' : shipment.status}
                      </span>
                    </td>
                    <td className="py-3">{shipment.etd || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
