"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
  Plus,
  ChevronLeft,
  Eye,
  Download,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface VATDeclaration {
  id: string;
  declaration_number: string;
  period_type: string;
  period: string;
  year: number;
  output_vat: number;
  input_vat: number;
  net_vat: number;
  previous_credit: number;
  vat_payable: number;
  vat_refundable: number;
  status: string;
  submitted_at: string;
  due_date: string;
  currency: string;
}

interface PaginatedResponse {
  items: VATDeclaration[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export default function VATDeclarationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [declarations, setDeclarations] = useState<VATDeclaration[]>([]);
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0, pages: 0 });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchDeclarations();
  }, [router, pagination.page, selectedYear, statusFilter]);

  const fetchDeclarations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        size: pagination.size.toString(),
        year: selectedYear.toString(),
      });
      if (statusFilter) params.append("status", statusFilter);

      const res = await apiFetch<PaginatedResponse>(
        `/accounting/vat-declarations?${params.toString()}`
      );
      setDeclarations(res.items);
      setPagination({ ...pagination, total: res.total, pages: res.pages });
    } catch (error) {
      console.error("Failed to fetch declarations:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = "VND") => {
    return new Intl.NumberFormat("vi-VN").format(value) + " " + currency;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === "DRAFT";
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      DRAFT: {
        bg: isOverdue ? "bg-red-100" : "bg-gray-100",
        text: isOverdue ? "text-red-700" : "text-gray-700",
        icon: isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />,
        label: isOverdue ? "Quá hạn" : "Nháp"
      },
      SUBMITTED: { bg: "bg-blue-100", text: "text-blue-700", icon: <Send className="w-3 h-3" />, label: "Đã nộp" },
      ACCEPTED: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle className="w-3 h-3" />, label: "Đã chấp nhận" },
      REJECTED: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="w-3 h-3" />, label: "Bị từ chối" },
      AMENDED: { bg: "bg-yellow-100", text: "text-yellow-700", icon: <AlertCircle className="w-3 h-3" />, label: "Đã điều chỉnh" },
    };
    const style = styles[status] || styles.DRAFT;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {style.label}
      </span>
    );
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounting/tax" className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tờ khai VAT</h1>
            <p className="text-gray-600 mt-1">Kê khai thuế GTGT theo tháng/quý</p>
          </div>
        </div>
        <Link
          href="/accounting/tax/vat-declarations/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo tờ khai
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {years.map((y) => (
            <option key={y} value={y}>Năm {y}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="SUBMITTED">Đã nộp</option>
          <option value="ACCEPTED">Đã chấp nhận</option>
          <option value="REJECTED">Bị từ chối</option>
          <option value="AMENDED">Đã điều chỉnh</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tờ khai</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kỳ</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">VAT đầu ra</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">VAT đầu vào</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">VAT phải nộp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hạn nộp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày nộp</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : declarations.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              declarations.map((dec) => (
                <tr key={dec.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-blue-600">{dec.declaration_number}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {dec.period_type === "MONTHLY" ? "Tháng" : "Quý"} {dec.period}/{dec.year}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                    {formatCurrency(dec.output_vat, dec.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                    {formatCurrency(dec.input_vat, dec.currency)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    dec.vat_payable > 0 ? "text-red-600" : "text-green-600"
                  }`}>
                    {dec.vat_payable > 0
                      ? formatCurrency(dec.vat_payable, dec.currency)
                      : dec.vat_refundable > 0
                        ? `(${formatCurrency(dec.vat_refundable, dec.currency)})`
                        : formatCurrency(0, dec.currency)
                    }
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(dec.due_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(dec.submitted_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(dec.status, dec.due_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/accounting/tax/vat-declarations/${dec.id}`}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        className="p-1 text-gray-500 hover:text-green-600"
                        title="Tải xuống"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {dec.status === "DRAFT" && (
                        <button
                          className="p-1 text-gray-500 hover:text-blue-600"
                          title="Nộp tờ khai"
                        >
                          <Send className="w-4 h-4" />
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
            Hiển thị {declarations.length} / {pagination.total} tờ khai
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
