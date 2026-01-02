"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Cog,
  Loader2,
  Wrench,
  Play,
  Pause,
  Clock,
  DollarSign,
  User,
  MapPin,
} from "lucide-react";

interface Workstation {
  id: string;
  code: string;
  name: string;
  description: string | null;
  workstation_type: string;
  status: string;
  warehouse_id: string | null;
  location_code: string | null;
  capacity_per_hour: number;
  efficiency_rate: number;
  hourly_cost: number;
  equipment_name: string | null;
  brand: string | null;
  model: string | null;
  operator_name: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function WorkstationsPage() {
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchWorkstations = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/mes/workstations?page=${pagination.page}&size=${pagination.size}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterType) url += `&workstation_type=${filterType}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setWorkstations(data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching workstations:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus, filterType, searchTerm]);

  useEffect(() => {
    fetchWorkstations();
  }, [fetchWorkstations]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "INACTIVE":
        return "bg-gray-100 text-gray-700";
      case "MAINTENANCE":
        return "bg-orange-100 text-orange-700";
      case "BROKEN":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: "Hoạt động",
      INACTIVE: "Không hoạt động",
      MAINTENANCE: "Đang bảo trì",
      BROKEN: "Hỏng",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      MACHINE: "Máy móc",
      ASSEMBLY: "Lắp ráp",
      MANUAL: "Thủ công",
      PACKING: "Đóng gói",
      QUALITY: "Kiểm tra CL",
      STORAGE: "Lưu trữ",
      OTHER: "Khác",
    };
    return labels[type] || type;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Stats
  const stats = {
    total: workstations.length,
    active: workstations.filter((w) => w.status === "ACTIVE").length,
    maintenance: workstations.filter((w) => w.status === "MAINTENANCE").length,
    inactive: workstations.filter((w) => w.status === "INACTIVE" || w.status === "BROKEN").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Trạm làm việc</h1>
          <p className="text-gray-500">Quản lý máy móc, thiết bị sản xuất</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Thêm trạm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Cog className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng trạm</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-gray-500">Đang hoạt động</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Wrench className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.maintenance}</p>
              <p className="text-sm text-gray-500">Đang bảo trì</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Pause className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inactive}</p>
              <p className="text-sm text-gray-500">Ngừng hoạt động</p>
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
            placeholder="Tìm kiếm trạm, thiết bị..."
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
          <option value="MACHINE">Máy móc</option>
          <option value="ASSEMBLY">Lắp ráp</option>
          <option value="MANUAL">Thủ công</option>
          <option value="PACKING">Đóng gói</option>
          <option value="QUALITY">Kiểm tra CL</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Không hoạt động</option>
          <option value="MAINTENANCE">Đang bảo trì</option>
          <option value="BROKEN">Hỏng</option>
        </select>
      </div>

      {/* Workstations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workstations.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {searchTerm || filterStatus || filterType
              ? "Không tìm thấy trạm phù hợp"
              : "Chưa có trạm làm việc nào."}
          </div>
        ) : (
          workstations.map((ws) => (
            <div key={ws.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      ws.status === "ACTIVE"
                        ? "bg-green-500"
                        : ws.status === "MAINTENANCE"
                        ? "bg-orange-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <div>
                    <h3 className="font-semibold">{ws.name}</h3>
                    <p className="text-sm text-gray-500">{ws.code}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ws.status)}`}>
                  {getStatusLabel(ws.status)}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Cog className="w-4 h-4" />
                  <span>{getTypeLabel(ws.workstation_type)}</span>
                  {ws.equipment_name && (
                    <span className="text-gray-400">- {ws.equipment_name}</span>
                  )}
                </div>

                {ws.location_code && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{ws.location_code}</span>
                  </div>
                )}

                {ws.operator_name && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{ws.operator_name}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{ws.capacity_per_hour}/giờ</span>
                  </div>
                  <div className="text-sm">
                    <span className={ws.efficiency_rate >= 80 ? "text-green-600" : "text-orange-600"}>
                      {ws.efficiency_rate}% hiệu suất
                    </span>
                  </div>
                </div>

                {ws.next_maintenance_date && (
                  <div className="flex items-center gap-2 text-orange-600 text-xs pt-1">
                    <Wrench className="w-3 h-3" />
                    <span>Bảo trì tiếp: {formatDate(ws.next_maintenance_date)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                <button className="flex-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                  <Eye className="w-4 h-4 inline mr-1" />
                  Chi tiết
                </button>
                <button className="flex-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                  <Edit className="w-4 h-4 inline mr-1" />
                  Sửa
                </button>
                {ws.status === "ACTIVE" && (
                  <button className="px-3 py-1.5 text-sm border rounded hover:bg-orange-50 text-orange-600">
                    <Wrench className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border rounded-lg">
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
  );
}
