"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Receipt,
  Plus,
  ChevronLeft,
  Search,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface DebitNote {
  id: string;
  debit_note_number: string;
  debit_note_date: string;
  vendor_name: string;
  original_invoice_number: string;
  total_amount: number;
  currency: string;
  reason: string;
  status: string;
}

interface PaginatedResponse {
  items: DebitNote[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export default function DebitNotesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchDebitNotes();
  }, [router, pagination.page, search, statusFilter]);

  const fetchDebitNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        size: pagination.size.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);

      const res = await apiFetch<PaginatedResponse>(
        `/accounting/debit-notes?${params.toString()}`
      );
      setDebitNotes(res.items);
      setPagination({ ...pagination, total: res.total, pages: res.pages });
    } catch (error) {
      console.error("Failed to fetch debit notes:", error);
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
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      DRAFT: { bg: "bg-gray-100", text: "text-gray-700", icon: <Clock className="w-3 h-3" /> },
      CONFIRMED: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle className="w-3 h-3" /> },
      CANCELLED: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="w-3 h-3" /> },
    };
    const style = styles[status] || styles.DRAFT;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/accounts-payable" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phiếu tăng giá</h1>
            <p className="text-gray-600 mt-1">Debit Notes - Điều chỉnh tăng công nợ nhà cung cấp</p>
          </div>
        </div>
        <Link
          href="/accounting/accounts-payable/debit-notes/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo phiếu tăng giá
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm theo số phiếu, nhà cung cấp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số phiếu</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhà cung cấp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hóa đơn gốc</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lý do</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số tiền</th>
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
            ) : debitNotes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              debitNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-blue-600">{note.debit_note_number}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(note.debit_note_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{note.vendor_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{note.original_invoice_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{note.reason}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">
                    +{formatCurrency(note.total_amount, note.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(note.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/accounting/accounts-payable/debit-notes/${note.id}`}
                        className="p-1 text-gray-500 hover:text-blue-600"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {note.status === "DRAFT" && (
                        <button className="p-1 text-gray-500 hover:text-red-600">
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
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Hiển thị {debitNotes.length} / {pagination.total} phiếu
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
