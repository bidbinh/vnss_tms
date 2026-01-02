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
  ClipboardCheck,
  AlertTriangle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Calendar,
} from "lucide-react";

interface QualityCheck {
  id: string;
  check_number: string;
  check_date: string;
  check_type: string;
  status: string;
  warehouse_id: string;
  source_document_type: string | null;
  source_document_id: string | null;
  source_document_number: string | null;
  product_id: string;
  product_code: string;
  product_name: string;
  lot_id: string | null;
  lot_number: string | null;
  sample_quantity: number;
  checked_quantity: number;
  passed_quantity: number;
  failed_quantity: number;
  result: string | null;
  inspector_id: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function QualityCheckPage() {
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchChecks = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/wms/quality-checks?page=${pagination.page}&size=${pagination.size}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterResult) url += `&result=${filterResult}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setChecks(data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching quality checks:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus, filterResult]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

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

  const filteredChecks = checks.filter(
    (check) =>
      check.check_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (check.lot_number && check.lot_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Stats
  const stats = {
    total: checks.length,
    pending: checks.filter((c) => c.status === "PENDING").length,
    inProgress: checks.filter((c) => c.status === "IN_PROGRESS").length,
    passed: checks.filter((c) => c.result === "PASSED").length,
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
          <p className="text-gray-500">Quản lý các phiếu kiểm tra chất lượng hàng hóa</p>
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
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
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
            placeholder="Tìm kiếm phiếu, sản phẩm, lô..."
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

      {/* QC Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số phiếu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lô
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày kiểm tra
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SL Mẫu
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đạt / Không đạt
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
              {filteredChecks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || filterStatus || filterResult
                      ? "Không tìm thấy phiếu phù hợp"
                      : "Chưa có phiếu kiểm tra chất lượng nào."}
                  </td>
                </tr>
              ) : (
                filteredChecks.map((check) => (
                  <tr key={check.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{check.check_number}</span>
                      {check.source_document_number && (
                        <p className="text-xs text-gray-500">
                          Từ: {check.source_document_number}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{check.product_name}</p>
                        <p className="text-xs text-gray-500">{check.product_code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {check.lot_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(check.check_date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">{check.sample_quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-green-600">{check.passed_quantity}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-red-600">{check.failed_quantity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(check.status)}`}
                      >
                        {getStatusLabel(check.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getResultColor(check.result)}`}
                      >
                        {getResultLabel(check.result)}
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
                        {check.status === "PENDING" && (
                          <button
                            className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                            title="Bắt đầu kiểm tra"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                          </button>
                        )}
                        {check.status === "IN_PROGRESS" && (
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
