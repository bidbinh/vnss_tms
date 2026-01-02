"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  Loader2,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Hammer,
  User,
  Cog,
} from "lucide-react";

interface WorkOrder {
  id: string;
  work_order_number: string;
  description: string | null;
  work_order_type: string;
  status: string;
  priority: number;
  production_order_id: string;
  production_order_number: string | null;
  step_number: number;
  operation_code: string | null;
  operation_name: string | null;
  workstation_id: string | null;
  workstation_code: string | null;
  workstation_name: string | null;
  product_name: string | null;
  planned_quantity: number;
  completed_quantity: number;
  scrapped_quantity: number;
  unit_name: string | null;
  planned_total_time: number;
  actual_total_time: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  operator_name: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/mes/work-orders?page=${pagination.page}&size=${pagination.size}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching work orders:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("vi-VN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "PENDING":
        return "bg-gray-100 text-gray-700";
      case "READY":
        return "bg-blue-100 text-blue-700";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-700";
      case "PAUSED":
        return "bg-yellow-100 text-yellow-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "Chờ thực hiện",
      READY: "Sẵn sàng",
      IN_PROGRESS: "Đang thực hiện",
      PAUSED: "Tạm dừng",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };
    return labels[status] || status;
  };

  const getProgress = (order: WorkOrder) => {
    if (order.planned_quantity === 0) return 0;
    return Math.round((order.completed_quantity / order.planned_quantity) * 100);
  };

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING" || o.status === "READY").length,
    inProgress: orders.filter((o) => o.status === "IN_PROGRESS").length,
    completed: orders.filter((o) => o.status === "COMPLETED").length,
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Lệnh công việc</h1>
          <p className="text-gray-500">Chi tiết từng công đoạn sản xuất</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Hammer className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng công việc</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-gray-500">Chờ thực hiện</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Play className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">Đang thực hiện</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-gray-500">Hoàn thành</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm lệnh công việc..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ thực hiện</option>
          <option value="READY">Sẵn sàng</option>
          <option value="IN_PROGRESS">Đang thực hiện</option>
          <option value="PAUSED">Tạm dừng</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lệnh
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Công đoạn
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạm làm việc
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SL hoàn thành
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người thực hiện
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || filterStatus
                      ? "Không tìm thấy lệnh phù hợp"
                      : "Chưa có lệnh công việc nào."}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{order.work_order_number}</span>
                      <p className="text-xs text-gray-500">
                        Từ: {order.production_order_number}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{order.operation_name || "-"}</p>
                        <p className="text-xs text-gray-500">
                          Bước {order.step_number} - {order.operation_code}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {order.workstation_name ? (
                        <div className="flex items-center gap-2">
                          <Cog className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm">{order.workstation_name}</p>
                            <p className="text-xs text-gray-500">{order.workstation_code}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center">
                        <div>
                          <span className="font-medium">{order.completed_quantity}</span>
                          <span className="text-gray-400"> / {order.planned_quantity}</span>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              getProgress(order) === 100 ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${getProgress(order)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div>
                        <p className="text-gray-600">
                          {formatTime(order.actual_total_time || 0)}
                        </p>
                        <p className="text-xs text-gray-400">
                          / {formatTime(order.planned_total_time)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {order.operator_name ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{order.operator_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Chưa phân công</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(order.status === "PENDING" || order.status === "READY") && (
                          <button
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                            title="Bắt đầu"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === "IN_PROGRESS" && (
                          <>
                            <button
                              className="p-1.5 hover:bg-yellow-100 rounded text-yellow-600"
                              title="Tạm dừng"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 hover:bg-green-100 rounded text-green-600"
                              title="Hoàn thành"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {order.status === "PAUSED" && (
                          <button
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                            title="Tiếp tục"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {(pagination.page - 1) * pagination.size + 1} -{" "}
              {Math.min(pagination.page * pagination.size, pagination.total)} trong{" "}
              {pagination.total} kết quả
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="px-3 py-1">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
