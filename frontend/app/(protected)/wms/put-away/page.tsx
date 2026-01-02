"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Package,
  Loader2,
  FileText,
  MapPin,
  ArrowRight,
  User,
  Play,
  PackageOpen,
} from "lucide-react";

interface PutawayTask {
  id: string;
  task_number: string;
  task_date: string;
  status: string;
  priority: number;
  warehouse_id: string;
  source_document_type: string | null;
  source_document_id: string | null;
  source_document_number: string | null;
  product_id: string;
  product_code: string;
  product_name: string;
  lot_id: string | null;
  lot_number: string | null;
  from_location_id: string | null;
  from_location_code: string | null;
  to_location_id: string | null;
  to_location_code: string | null;
  suggested_location_code: string | null;
  quantity: number;
  quantity_done: number;
  assigned_to: string | null;
  assigned_to_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function PutAwayPage() {
  const [tasks, setTasks] = useState<PutawayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/wms/putaway-tasks?page=${pagination.page}&size=${pagination.size}`;
      if (filterStatus) url += `&status=${filterStatus}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching putaway tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
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
        return "bg-yellow-100 text-yellow-700";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-700";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "Chờ phân công",
      ASSIGNED: "Đã phân công",
      IN_PROGRESS: "Đang thực hiện",
      COMPLETED: "Hoàn thành",
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

  const filteredTasks = tasks.filter(
    (task) =>
      task.task_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.lot_number && task.lot_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.to_location_code && task.to_location_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "PENDING").length,
    assigned: tasks.filter((t) => t.status === "ASSIGNED").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Xếp kho (Put Away)</h1>
          <p className="text-gray-500">Quản lý các tác vụ xếp hàng vào vị trí kho</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Tạo tác vụ xếp kho
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PackageOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng tác vụ</p>
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
              <p className="text-sm text-gray-500">Chờ phân công</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.assigned}</p>
              <p className="text-sm text-gray-500">Đã phân công</p>
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
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tác vụ, sản phẩm, vị trí..."
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
          <option value="PENDING">Chờ phân công</option>
          <option value="ASSIGNED">Đã phân công</option>
          <option value="IN_PROGRESS">Đang thực hiện</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tác vụ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Từ → Đến
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số lượng
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ưu tiên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhân viên
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
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || filterStatus
                      ? "Không tìm thấy tác vụ phù hợp"
                      : "Chưa có tác vụ xếp kho nào."}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{task.task_number}</span>
                      {task.source_document_number && (
                        <p className="text-xs text-gray-500">
                          Từ: {task.source_document_number}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(task.task_date)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{task.product_name}</p>
                        <p className="text-xs text-gray-500">{task.product_code}</p>
                        {task.lot_number && (
                          <p className="text-xs text-gray-400">Lô: {task.lot_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">
                            {task.from_location_code || "Khu nhận hàng"}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-500" />
                          <span className="font-medium text-blue-600">
                            {task.to_location_code || task.suggested_location_code || "-"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <span className="font-medium">{task.quantity_done}</span>
                        <span className="text-gray-400"> / {task.quantity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}
                      >
                        {getPriorityLabel(task.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {task.assigned_to_name ? (
                          <>
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{task.assigned_to_name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">Chưa phân công</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}
                      >
                        {getStatusLabel(task.status)}
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
                        {task.status === "PENDING" && (
                          <button
                            className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                            title="Phân công"
                          >
                            <User className="w-4 h-4" />
                          </button>
                        )}
                        {(task.status === "ASSIGNED" || task.status === "IN_PROGRESS") && (
                          <button
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                            title="Hoàn thành"
                          >
                            <CheckCircle className="w-4 h-4" />
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
