"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Loader2,
  CheckCircle,
  TrendingUp,
  Clock,
  Copy,
  GitBranch,
} from "lucide-react";

interface Routing {
  id: string;
  code: string;
  name: string;
  description: string | null;
  version: string;
  product_id: string | null;
  product_code: string | null;
  product_name: string | null;
  status: string;
  total_time_minutes: number;
  total_setup_time: number;
  total_cost: number;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function RoutingsPage() {
  const [routings, setRoutings] = useState<Routing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchRoutings = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/mes/routings?page=${pagination.page}&size=${pagination.size}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRoutings(data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching routings:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus, searchTerm]);

  useEffect(() => {
    fetchRoutings();
  }, [fetchRoutings]);

  const formatTime = (minutes: number) => {
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
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "DRAFT":
        return "bg-gray-100 text-gray-700";
      case "INACTIVE":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: "Bản nháp",
      ACTIVE: "Đang sử dụng",
      INACTIVE: "Ngừng sử dụng",
    };
    return labels[status] || status;
  };

  // Stats
  const stats = {
    total: routings.length,
    active: routings.filter((r) => r.status === "ACTIVE").length,
    draft: routings.filter((r) => r.status === "DRAFT").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Quy trình sản xuất</h1>
          <p className="text-gray-500">Định nghĩa các bước/công đoạn sản xuất</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Tạo quy trình mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GitBranch className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng quy trình</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-gray-500">Đang sử dụng</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.draft}</p>
              <p className="text-sm text-gray-500">Bản nháp</p>
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
            placeholder="Tìm kiếm quy trình..."
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
          <option value="ACTIVE">Đang sử dụng</option>
          <option value="INACTIVE">Ngừng sử dụng</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã quy trình
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng thời gian
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TG chuẩn bị
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chi phí
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phiên bản
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
              {routings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || filterStatus
                      ? "Không tìm thấy quy trình phù hợp"
                      : "Chưa có quy trình nào."}
                  </td>
                </tr>
              ) : (
                routings.map((routing) => (
                  <tr key={routing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{routing.code}</span>
                      <p className="text-sm text-gray-500">{routing.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      {routing.product_name ? (
                        <div>
                          <p className="font-medium">{routing.product_name}</p>
                          <p className="text-xs text-gray-500">{routing.product_code}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(routing.total_time_minutes)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">
                      {formatTime(routing.total_setup_time)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(routing.total_cost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm">{routing.version}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(routing.status)}`}
                      >
                        {getStatusLabel(routing.status)}
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
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                          title="Nhân bản"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {routing.status === "DRAFT" && (
                          <button
                            className="p-1.5 hover:bg-green-100 rounded text-green-600"
                            title="Kích hoạt"
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
