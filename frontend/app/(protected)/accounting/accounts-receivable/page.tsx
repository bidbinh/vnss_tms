"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Eye,
  Send,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CustomerInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  currency: string;
  status: string;
  description: string | null;
}

interface AgingSummary {
  current: number;
  "1_30": number;
  "31_60": number;
  "61_90": number;
  over_90: number;
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  PARTIAL: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
  OVERDUE: "Quá hạn",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  OVERDUE: "bg-red-100 text-red-700",
};

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const overdueOnly = searchParams.get("overdue") === "true";

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [aging, setAging] = useState<AgingSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [overdueFilter, setOverdueFilter] = useState(overdueOnly);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchAging();
  }, [router]);

  useEffect(() => {
    fetchInvoices();
  }, [page, pageSize, search, statusFilter, overdueFilter]);

  const fetchAging = async () => {
    try {
      const res = await apiFetch<{ summary: AgingSummary; total: number }>(
        "/accounting/ar-aging"
      );
      setAging(res.summary);
    } catch (error) {
      console.error("Failed to fetch aging:", error);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (overdueFilter) params.set("overdue_only", "true");

      const res = await apiFetch<{
        items: CustomerInvoice[];
        total: number;
        total_pages: number;
      }>(`/accounting/customer-invoices?${params.toString()}`);

      setInvoices(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN").format(value) + " đ";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "PAID" || status === "CANCELLED") return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Công nợ phải thu</h1>
            <p className="text-gray-600 mt-1">Quản lý hóa đơn và thu tiền khách hàng</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/accounting/accounts-receivable/receipts"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <DollarSign className="w-4 h-4" />
            Phiếu thu
          </Link>
          <Link
            href="/accounting/accounts-receivable/invoices/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Tạo hóa đơn
          </Link>
        </div>
      </div>

      {/* Aging Summary */}
      {aging && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Chưa đến hạn</p>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(aging.current)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">1-30 ngày</p>
            <p className="text-lg font-semibold text-yellow-600">
              {formatCurrency(aging["1_30"])}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">31-60 ngày</p>
            <p className="text-lg font-semibold text-orange-600">
              {formatCurrency(aging["31_60"])}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">61-90 ngày</p>
            <p className="text-lg font-semibold text-red-500">
              {formatCurrency(aging["61_90"])}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <p className="text-sm text-gray-500">&gt; 90 ngày</p>
            <p className="text-lg font-semibold text-red-600">
              {formatCurrency(aging.over_90)}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <p className="text-sm text-blue-600">Tổng phải thu</p>
            <p className="text-lg font-bold text-blue-700">
              {formatCurrency(aging.total)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo số hóa đơn..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overdueFilter}
              onChange={(e) => {
                setOverdueFilter(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Chỉ hiển thị quá hạn</span>
          </label>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Số hóa đơn
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ngày HĐ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Hạn TT
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Tổng tiền
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Đã thu
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Còn lại
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-gray-600">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Không tìm thấy hóa đơn nào
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={`hover:bg-gray-50 ${
                      isOverdue(invoice.due_date, invoice.status) ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/accounting/accounts-receivable/invoices/${invoice.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                      {invoice.description && (
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                          {invoice.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div
                        className={`flex items-center gap-1 ${
                          isOverdue(invoice.due_date, invoice.status)
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {isOverdue(invoice.due_date, invoice.status) && (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {formatDate(invoice.due_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {formatCurrency(invoice.paid_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(invoice.balance_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          STATUS_COLORS[invoice.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {STATUS_LABELS[invoice.status] || invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/accounting/accounts-receivable/invoices/${invoice.id}`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {invoice.status === "DRAFT" && (
                          <Link
                            href={`/accounting/accounts-receivable/invoices/${invoice.id}/send`}
                            className="p-1.5 rounded hover:bg-blue-100 text-gray-500 hover:text-blue-600"
                            title="Gửi hóa đơn"
                          >
                            <Send className="w-4 h-4" />
                          </Link>
                        )}
                        {invoice.balance_amount > 0 &&
                          ["SENT", "PARTIAL"].includes(invoice.status) && (
                            <Link
                              href={`/accounting/accounts-receivable/receipts/new?invoice=${invoice.id}`}
                              className="p-1.5 rounded hover:bg-green-100 text-gray-500 hover:text-green-600"
                              title="Ghi nhận thu tiền"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Link>
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
          <div className="text-sm text-gray-600">
            Hiển thị {total > 0 ? (page - 1) * pageSize + 1 : 0} -{" "}
            {Math.min(page * pageSize, total)} / {total} hóa đơn
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountsReceivablePage() {
  return (
    <Suspense fallback={<div className="p-6">Đang tải...</div>}>
      <PageContent />
    </Suspense>
  );
}
