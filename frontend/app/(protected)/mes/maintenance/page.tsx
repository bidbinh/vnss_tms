"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Loader2,
  Wrench,
  AlertTriangle,
  Calendar,
  Play,
  XCircle,
  Cog,
  Timer,
} from "lucide-react";

interface EquipmentMaintenance {
  id: string;
  maintenance_number: string;
  maintenance_type: string;
  status: string;
  priority: number;
  workstation_id: string;
  workstation_code: string | null;
  workstation_name: string | null;
  description: string | null;
  scheduled_date: string;
  estimated_duration: number;
  actual_start: string | null;
  actual_end: string | null;
  actual_duration: number | null;
  technician_id: string | null;
  technician_name: string | null;
  cost_estimate: number;
  actual_cost: number | null;
  parts_used: string | null;
  findings: string | null;
  actions_taken: string | null;
  next_maintenance_date: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<EquipmentMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchMaintenances = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/mes/maintenance?page=${pagination.page}&size=${pagination.size}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterType) url += `&maintenance_type=${filterType}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMaintenances(data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching maintenance:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus, filterType, searchTerm]);

  useEffect(() => {
    fetchMaintenances();
  }, [fetchMaintenances]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-700";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      case "OVERDUE":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      SCHEDULED: "Đã lên lịch",
      IN_PROGRESS: "Đang thực hiện",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
      OVERDUE: "Quá hạn",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PREVENTIVE: "Bảo trì định kỳ",
      CORRECTIVE: "Sửa chữa",
      PREDICTIVE: "Dự đoán",
      EMERGENCY: "Khẩn cấp",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PREVENTIVE":
        return "bg-blue-100 text-blue-700";
      case "CORRECTIVE":
        return "bg-orange-100 text-orange-700";
      case "PREDICTIVE":
        return "bg-purple-100 text-purple-700";
      case "EMERGENCY":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority <= 1) return "Cao";
    if (priority <= 3) return "Trung bình";
    return "Thấp";
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 1) return "text-red-600";
    if (priority <= 3) return "text-yellow-600";
    return "text-gray-600";
  };

  // Stats
  const stats = {
    total: maintenances.length,
    scheduled: maintenances.filter((m) => m.status === "SCHEDULED").length,
    inProgress: maintenances.filter((m) => m.status === "IN_PROGRESS").length,
    completed: maintenances.filter((m) => m.status === "COMPLETED").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Bảo trì thiết bị</h1>
          <p className="text-gray-500">Quản lý lịch bảo trì và sửa chữa thiết bị</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Tạo lịch bảo trì
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng lịch bảo trì</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
              <p className="text-sm text-gray-500">Đã lên lịch</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Timer className="w-5 h-5 text-orange-600" />
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
            placeholder="Tìm kiếm bảo trì, thiết bị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả loại</option>
          <option value="PREVENTIVE">Bảo trì định kỳ</option>
          <option value="CORRECTIVE">Sửa chữa</option>
          <option value="PREDICTIVE">Dự đoán</option>
          <option value="EMERGENCY">Khẩn cấp</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="SCHEDULED">Đã lên lịch</option>
          <option value="IN_PROGRESS">Đang thực hiện</option>
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
                  Số phiếu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại bảo trì
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thiết bị
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày lên lịch
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chi phí
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
              {maintenances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || filterStatus || filterType
                      ? "Không tìm thấy phiếu phù hợp"
                      : "Chưa có lịch bảo trì nào."}
                  </td>
                </tr>
              ) : (
                maintenances.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{m.maintenance_number}</span>
                      {m.description && (
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">
                          {m.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(m.maintenance_type)}`}>
                        {getTypeLabel(m.maintenance_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Cog className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{m.workstation_name || "-"}</p>
                          <p className="text-xs text-gray-500">{m.workstation_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p>{formatDate(m.scheduled_date)}</p>
                        {m.actual_start && (
                          <p className="text-xs text-gray-500">
                            Bắt đầu: {formatDateTime(m.actual_start)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div>
                        <p>{formatDuration(m.estimated_duration)}</p>
                        {m.actual_duration && (
                          <p className="text-xs text-gray-500">
                            Thực tế: {formatDuration(m.actual_duration)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div>
                        <p>{formatCurrency(m.cost_estimate)}</p>
                        {m.actual_cost && (
                          <p className={`text-xs ${m.actual_cost > m.cost_estimate ? "text-red-500" : "text-green-500"}`}>
                            Thực tế: {formatCurrency(m.actual_cost)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${getPriorityColor(m.priority)}`}>
                        {getPriorityLabel(m.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(m.status)}`}
                      >
                        {getStatusLabel(m.status)}
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
                        {m.status === "SCHEDULED" && (
                          <button
                            className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                            title="Bắt đầu"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {m.status === "IN_PROGRESS" && (
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
