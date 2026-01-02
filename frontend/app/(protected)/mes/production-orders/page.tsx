"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Play,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  Calendar,
  User,
  AlertTriangle,
  Pause,
  XCircle,
} from "lucide-react";

interface ProductionOrder {
  id: string;
  order_number: string;
  order_date: string;
  order_type: string;
  status: string;
  priority: number;
  product_id: string;
  product_code: string | null;
  product_name: string | null;
  bom_id: string | null;
  planned_quantity: number;
  completed_quantity: number;
  scrapped_quantity: number;
  unit_name: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  responsible_name: string | null;
  notes: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/mes/production-orders?page=${pagination.page}&size=${pagination.size}`;
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
      console.error("Error fetching production orders:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "DRAFT":
        return "bg-gray-100 text-gray-700";
      case "PLANNED":
        return "bg-purple-100 text-purple-700";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-700";
      case "RELEASED":
        return "bg-yellow-100 text-yellow-700";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-700";
      case "ON_HOLD":
        return "bg-red-100 text-red-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: "Bản nháp",
      PLANNED: "Đã lên kế hoạch",
      CONFIRMED: "Đã xác nhận",
      RELEASED: "Đã phát hành",
      IN_PROGRESS: "Đang sản xuất",
      ON_HOLD: "Tạm dừng",
      COMPLETED: "Hoàn thành",
      CLOSED: "Đã đóng",
      CANCELLED: "Đã hủy",
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "bg-red-100 text-red-700";
    if (priority >= 5) return "bg-orange-100 text-orange-700";
    return "bg-gray-100 text-gray-600";
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return "Cao";
    if (priority >= 5) return "Trung bình";
    return "Thấp";
  };

  const getProgress = (order: ProductionOrder) => {
    if (order.planned_quantity === 0) return 0;
    return Math.round((order.completed_quantity / order.planned_quantity) * 100);
  };

  // Stats
  const stats = {
    total: orders.length,
    draft: orders.filter((o) => o.status === "DRAFT").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Lệnh sản xuất</h1>
          <p className="text-gray-500">Quản lý các lệnh sản xuất trong nhà máy</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Tạo lệnh sản xuất
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng lệnh</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Edit className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-sm text-gray-500">Bản nháp</p>
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
              <p className="text-sm text-gray-500">Đang sản xuất</p>
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
            placeholder="Tìm kiếm lệnh, sản phẩm..."
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
          <option value="DRAFT">Bản nháp</option>
          <option value="PLANNED">Đã lên kế hoạch</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="RELEASED">Đã phát hành</option>
          <option value="IN_PROGRESS">Đang sản xuất</option>
          <option value="ON_HOLD">Tạm dừng</option>
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
                  Sản phẩm
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lượng
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiến độ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày KH
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ưu tiên
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
                      : "Chưa có lệnh sản xuất nào."}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{order.order_number}</span>
                      <p className="text-xs text-gray-500">{formatDate(order.order_date)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{order.product_name || "-"}</p>
                        <p className="text-xs text-gray-500">{order.product_code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div>
                        <span className="font-medium">{order.completed_quantity}</span>
                        <span className="text-gray-400"> / {order.planned_quantity}</span>
                        {order.unit_name && (
                          <span className="text-xs text-gray-500 ml-1">{order.unit_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              getProgress(order) === 100 ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${getProgress(order)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{getProgress(order)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(order.planned_start_date)}
                      </div>
                      {order.planned_end_date && (
                        <div className="text-xs text-gray-400">
                          → {formatDate(order.planned_end_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(order.priority)}`}
                      >
                        {getPriorityLabel(order.priority)}
                      </span>
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
                        {order.status === "DRAFT" && (
                          <button
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                            title="Sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {order.status === "RELEASED" && (
                          <button
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                            title="Bắt đầu sản xuất"
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
