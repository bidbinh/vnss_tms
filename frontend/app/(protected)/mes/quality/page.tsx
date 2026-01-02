"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Play,
  XCircle,
} from "lucide-react";

interface QualityControl {
  id: string;
  qc_number: string;
  qc_type: string;
  status: string;
  production_order_id: string | null;
  production_order_number: string | null;
  work_order_id: string | null;
  work_order_number: string | null;
  product_id: string;
  product_code: string | null;
  product_name: string | null;
  lot_number: string | null;
  batch_number: string | null;
  sample_size: number;
  inspected_quantity: number;
  passed_quantity: number;
  failed_quantity: number;
  result: string | null;
  inspector_id: string | null;
  inspector_name: string | null;
  inspection_date: string | null;
  notes: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function QualityControlPage() {
  const [controls, setControls] = useState<QualityControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchControls = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/mes/quality-controls?page=${pagination.page}&size=${pagination.size}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterResult) url += `&result=${filterResult}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setControls(data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching quality controls:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus, filterResult, searchTerm]);

  useEffect(() => {
    fetchControls();
  }, [fetchControls]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
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
        return "bg-gray-100 text-gray-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "Chờ kiểm tra",
      IN_PROGRESS: "Đang kiểm tra",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };
    return labels[status] || status;
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case "PASSED":
        return "bg-green-100 text-green-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      case "PARTIAL":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  const getResultLabel = (result: string | null) => {
    const labels: Record<string, string> = {
      PASSED: "Đạt",
      FAILED: "Không đạt",
      PARTIAL: "Đạt một phần",
    };
    return result ? labels[result] || result : "Chưa có";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      INCOMING: "Nhập kho",
      IN_PROCESS: "Trong sản xuất",
      FINAL: "Thành phẩm",
      OUTGOING: "Xuất kho",
    };
    return labels[type] || type;
  };

  const getPassRate = (qc: QualityControl) => {
    if (qc.inspected_quantity === 0) return 0;
    return Math.round((qc.passed_quantity / qc.inspected_quantity) * 100);
  };

  // Stats
  const stats = {
    total: controls.length,
    pending: controls.filter((c) => c.status === "PENDING").length,
    inProgress: controls.filter((c) => c.status === "IN_PROGRESS").length,
    passed: controls.filter((c) => c.result === "PASSED").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Kiểm tra chất lượng</h1>
          <p className="text-gray-500">Quản lý phiếu kiểm tra QC trong sản xuất</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Tạo phiếu QC
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng phiếu</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-gray-500">Chờ kiểm tra</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">Đang kiểm tra</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ThumbsUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.passed}</p>
              <p className="text-sm text-gray-500">Đạt chất lượng</p>
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
            placeholder="Tìm kiếm phiếu QC, sản phẩm..."
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
          <option value="PENDING">Chờ kiểm tra</option>
          <option value="IN_PROGRESS">Đang kiểm tra</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả kết quả</option>
          <option value="PASSED">Đạt</option>
          <option value="FAILED">Không đạt</option>
          <option value="PARTIAL">Đạt một phần</option>
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
                  Loại kiểm tra
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lô / Batch
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mẫu kiểm
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tỷ lệ đạt
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kết quả
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {controls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || filterStatus || filterResult
                      ? "Không tìm thấy phiếu phù hợp"
                      : "Chưa có phiếu kiểm tra chất lượng nào."}
                  </td>
                </tr>
              ) : (
                controls.map((qc) => (
                  <tr key={qc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{qc.qc_number}</span>
                      {qc.production_order_number && (
                        <p className="text-xs text-gray-500">
                          LSX: {qc.production_order_number}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {getTypeLabel(qc.qc_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{qc.product_name || "-"}</p>
                        <p className="text-xs text-gray-500">{qc.product_code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        {qc.lot_number && <p>Lô: {qc.lot_number}</p>}
                        {qc.batch_number && <p className="text-gray-500">Batch: {qc.batch_number}</p>}
                        {!qc.lot_number && !qc.batch_number && "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div>
                        <span className="font-medium">{qc.inspected_quantity}</span>
                        <span className="text-gray-400"> / {qc.sample_size}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-600">{qc.passed_quantity}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-600">{qc.failed_quantity}</span>
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              getPassRate(qc) >= 90 ? "bg-green-500" : getPassRate(qc) >= 70 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${getPassRate(qc)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(qc.status)}`}
                      >
                        {getStatusLabel(qc.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getResultColor(qc.result)}`}
                      >
                        {getResultLabel(qc.result)}
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
                        {qc.status === "PENDING" && (
                          <button
                            className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                            title="Bắt đầu kiểm tra"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {qc.status === "IN_PROGRESS" && (
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
