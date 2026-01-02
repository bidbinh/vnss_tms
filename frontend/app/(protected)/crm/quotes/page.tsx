"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Building2,
  ChevronLeft,
  ChevronRight,
  Send,
  CheckCircle,
  XCircle,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Quote {
  id: string;
  quote_number: string;
  version: number;
  account_id: string;
  account: {
    id: string;
    code: string;
    name: string;
  } | null;
  contact: {
    id: string;
    full_name: string;
  } | null;
  opportunity: {
    id: string;
    name: string;
  } | null;
  status: string;
  subtotal: number;
  total_amount: number;
  currency: string;
  valid_until: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  VIEWED: "Đã xem",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Từ chối",
  EXPIRED: "Hết hạn",
  REVISED: "Đã sửa đổi",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-700",
  REVISED: "bg-purple-100 text-purple-700",
};

export default function QuotesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Sorting
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    fetchQuotes();
  }, [page, pageSize, search, statusFilter, sortField, sortOrder]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (sortField) params.set("sort_by", sortField);
      if (sortOrder) params.set("sort_order", sortOrder);

      const res = await apiFetch<{
        items: Quote[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>(`/crm/quotes?${params.toString()}`);

      setQuotes(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQuote) return;

    try {
      await apiFetch(`/crm/quotes/${selectedQuote.id}`, {
        method: "DELETE",
      });
      setShowDeleteModal(false);
      setSelectedQuote(null);
      fetchQuotes();
    } catch (error) {
      console.error("Failed to delete quote:", error);
      alert("Không thể xóa báo giá này");
    }
  };

  const handleSend = async (quote: Quote) => {
    setProcessing(true);
    try {
      await apiFetch(`/crm/quotes/${quote.id}/send`, {
        method: "POST",
      });
      fetchQuotes();
    } catch (error) {
      console.error("Failed to send quote:", error);
      alert("Không thể gửi báo giá");
    } finally {
      setProcessing(false);
    }
  };

  const handleRevise = async (quote: Quote) => {
    setProcessing(true);
    try {
      const result = await apiFetch<{ id: string }>(`/crm/quotes/${quote.id}/revise`, {
        method: "POST",
      });
      router.push(`/crm/quotes/${result.id}/edit`);
    } catch (error) {
      console.error("Failed to revise quote:", error);
      alert("Không thể tạo bản sửa đổi");
    } finally {
      setProcessing(false);
    }
  };

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const canEdit = (status: string) => {
    return status === "DRAFT";
  };

  const canSend = (status: string) => {
    return status === "DRAFT";
  };

  const canRevise = (status: string) => {
    return ["SENT", "VIEWED", "REJECTED", "EXPIRED"].includes(status);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo giá</h1>
          <p className="text-gray-600 mt-1">Quản lý báo giá cho khách hàng</p>
        </div>
        <Link
          href="/crm/quotes/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo báo giá
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo số báo giá..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("quote_number")}
                >
                  <div className="flex items-center gap-1">
                    Số báo giá
                    <SortIcon field="quote_number" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Khách hàng
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cơ hội
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("total_amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Giá trị
                    <SortIcon field="total_amount" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("valid_until")}
                >
                  <div className="flex items-center gap-1">
                    Hiệu lực đến
                    <SortIcon field="valid_until" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Trạng thái
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-gray-600">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Không tìm thấy báo giá nào
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/crm/quotes/${quote.id}`} className="hover:underline">
                        <div className="text-sm font-medium text-blue-600">
                          {quote.quote_number}
                        </div>
                        {quote.version > 1 && (
                          <div className="text-xs text-gray-500">v{quote.version}</div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {quote.account ? (
                        <Link
                          href={`/crm/accounts/${quote.account.id}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3" />
                          {quote.account.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {quote.opportunity ? (
                        <Link
                          href={`/crm/opportunities/${quote.opportunity.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {quote.opportunity.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(quote.total_amount)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {quote.valid_until || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[quote.status] || "bg-gray-100 text-gray-700"}`}>
                        {STATUS_LABELS[quote.status] || quote.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/crm/quotes/${quote.id}`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canEdit(quote.status) && (
                          <Link
                            href={`/crm/quotes/${quote.id}/edit`}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        {canSend(quote.status) && (
                          <button
                            onClick={() => handleSend(quote)}
                            className="p-1.5 rounded hover:bg-blue-100 text-gray-500 hover:text-blue-600"
                            title="Gửi báo giá"
                            disabled={processing}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {canRevise(quote.status) && (
                          <button
                            onClick={() => handleRevise(quote)}
                            className="p-1.5 rounded hover:bg-purple-100 text-gray-500 hover:text-purple-600"
                            title="Tạo bản sửa đổi"
                            disabled={processing}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {quote.status !== "ACCEPTED" && (
                          <button
                            onClick={() => {
                              setSelectedQuote(quote);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
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
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Hiển thị {total > 0 ? ((page - 1) * pageSize) + 1 : 0} - {Math.min(page * pageSize, total)} / {total} báo giá
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">dòng</span>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xóa báo giá <strong>{selectedQuote.quote_number}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedQuote(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
