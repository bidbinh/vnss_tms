"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck,
  Plus,
  ChevronLeft,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface BankReconciliation {
  id: string;
  bank_account_id: string;
  bank_account_name: string;
  statement_date: string;
  statement_ending_balance: number;
  book_balance: number;
  reconciled_balance: number;
  difference: number;
  currency: string;
  status: string;
  reconciled_by: string;
  reconciled_at: string;
  unreconciled_count: number;
}

interface PaginatedResponse {
  items: BankReconciliation[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export default function BankReconciliationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchReconciliations();
  }, [router, pagination.page, statusFilter]);

  const fetchReconciliations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        size: pagination.size.toString(),
      });
      if (statusFilter) params.append("status", statusFilter);

      const res = await apiFetch<PaginatedResponse>(
        `/accounting/bank-reconciliations?${params.toString()}`
      );
      setReconciliations(res.items);
      setPagination({ ...pagination, total: res.total, pages: res.pages });
    } catch (error) {
      console.error("Failed to fetch reconciliations:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = "VND") => {
    return new Intl.NumberFormat("vi-VN").format(value) + " " + currency;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      DRAFT: { bg: "bg-gray-100", text: "text-gray-700", icon: <Clock className="w-3 h-3" />, label: "Nháp" },
      IN_PROGRESS: { bg: "bg-yellow-100", text: "text-yellow-700", icon: <Clock className="w-3 h-3" />, label: "Đang xử lý" },
      COMPLETED: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle className="w-3 h-3" />, label: "Hoàn thành" },
      CANCELLED: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="w-3 h-3" />, label: "Đã hủy" },
    };
    const style = styles[status] || styles.DRAFT;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {style.label}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/banking" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Đối chiếu Ngân hàng</h1>
            <p className="text-gray-600 mt-1">Bank Reconciliation - Đối chiếu sổ sách với sao kê ngân hàng</p>
          </div>
        </div>
        <Link
          href="/accounting/banking/reconciliation/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo đối chiếu mới
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng đối chiếu</p>
              <p className="text-xl font-semibold text-gray-900">{pagination.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đang xử lý</p>
              <p className="text-xl font-semibold text-yellow-600">
                {reconciliations.filter(r => r.status === "IN_PROGRESS").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hoàn thành</p>
              <p className="text-xl font-semibold text-green-600">
                {reconciliations.filter(r => r.status === "COMPLETED").length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Chưa khớp</p>
              <p className="text-xl font-semibold text-red-600">
                {reconciliations.reduce((sum, r) => sum + r.unreconciled_count, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="IN_PROGRESS">Đang xử lý</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tài khoản</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày sao kê</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số dư sao kê</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số dư sổ sách</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Chênh lệch</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Chưa khớp</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : reconciliations.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              reconciliations.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{rec.bank_account_name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(rec.statement_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(rec.statement_ending_balance, rec.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {formatCurrency(rec.book_balance, rec.currency)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    rec.difference === 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {formatCurrency(rec.difference, rec.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rec.unreconciled_count > 0 ? (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                        {rec.unreconciled_count}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        0
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(rec.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/accounting/banking/reconciliation/${rec.id}`}
                        className="p-1 text-gray-500 hover:text-blue-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Hiển thị {reconciliations.length} / {pagination.total} đối chiếu
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-gray-600">
              Trang {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
