"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  Package,
  Loader2,
  FileText,
  Truck,
  Calendar,
  Building,
  ArrowDownToLine,
  PackageCheck,
  AlertCircle,
} from "lucide-react";

interface GoodsReceipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  receipt_type: string;
  warehouse_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_delivery_note: string | null;
  source_document_type: string | null;
  source_document_number: string | null;
  status: string;
  total_lines: number;
  total_expected_qty: number;
  total_received_qty: number;
  total_rejected_qty: number;
  total_value: number;
  expected_arrival_date: string | null;
  actual_arrival_date: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export default function GoodsReceiptPage() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });

  const fetchReceipts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_BASE}/wms/goods-receipts?page=${pagination.page}&size=${pagination.size}`;
      if (filterStatus) url += `&status=${filterStatus}`;
      if (filterType) url += `&receipt_type=${filterType}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setReceipts(data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: data.total || 0,
          pages: data.pages || 0,
        }));
      }
    } catch (err) {
      console.error("Error fetching goods receipts:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.size, filterStatus, filterType]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

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
      case "DRAFT":
        return "bg-gray-100 text-gray-700";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-700";
      case "ARRIVED":
        return "bg-yellow-100 text-yellow-700";
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
      DRAFT: "Bản nháp",
      SCHEDULED: "Đã lên lịch",
      ARRIVED: "Đã đến",
      IN_PROGRESS: "Đang nhận hàng",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PURCHASE: "Mua hàng",
      TRANSFER: "Chuyển kho",
      RETURN: "Hàng trả về",
      OTHER: "Khác",
    };
    return labels[type] || type;
  };

  const filteredReceipts = receipts.filter(
    (receipt) =>
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.supplier_name &&
        receipt.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (receipt.source_document_number &&
        receipt.source_document_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Stats
  const stats = {
    total: receipts.length,
    scheduled: receipts.filter((r) => r.status === "SCHEDULED").length,
    arrived: receipts.filter((r) => r.status === "ARRIVED").length,
    inProgress: receipts.filter((r) => r.status === "IN_PROGRESS").length,
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
          <h1 className="text-2xl font-bold text-gray-900">Nhận hàng</h1>
          <p className="text-gray-500">Quản lý phiếu nhận hàng từ nhà cung cấp</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Tạo phiếu nhận hàng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Tổng phiếu</p>
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
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Truck className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.arrived}</p>
              <p className="text-sm text-gray-500">Đã đến</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ArrowDownToLine className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">Đang nhận</p>
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
            placeholder="Tìm kiếm phiếu, NCC, chứng từ..."
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
          <option value="PURCHASE">Mua hàng</option>
          <option value="TRANSFER">Chuyển kho</option>
          <option value="RETURN">Hàng trả về</option>
          <option value="OTHER">Khác</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="SCHEDULED">Đã lên lịch</option>
          <option value="ARRIVED">Đã đến</option>
          <option value="IN_PROGRESS">Đang nhận hàng</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số phiếu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại / Nguồn
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhà cung cấp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày nhận
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SL Dự kiến
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SL Thực nhận
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
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm || filterStatus || filterType
                      ? "Không tìm thấy phiếu phù hợp"
                      : "Chưa có phiếu nhận hàng nào."}
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">{receipt.receipt_number}</span>
                      {receipt.source_document_number && (
                        <p className="text-xs text-gray-500">
                          Từ: {receipt.source_document_number}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {getTypeLabel(receipt.receipt_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span>{receipt.supplier_name || "-"}</span>
                      </div>
                      {receipt.supplier_delivery_note && (
                        <p className="text-xs text-gray-500">
                          Phiếu giao: {receipt.supplier_delivery_note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(receipt.receipt_date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">{receipt.total_expected_qty}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <span
                          className={`font-medium ${
                            receipt.total_received_qty >= receipt.total_expected_qty
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {receipt.total_received_qty}
                        </span>
                        {receipt.total_rejected_qty > 0 && (
                          <span className="text-xs text-red-500 ml-1">
                            (-{receipt.total_rejected_qty})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          receipt.status
                        )}`}
                      >
                        {getStatusLabel(receipt.status)}
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
                        {receipt.status === "ARRIVED" && (
                          <button
                            className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
                            title="Bắt đầu nhận hàng"
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>
                        )}
                        {receipt.status === "IN_PROGRESS" && (
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
